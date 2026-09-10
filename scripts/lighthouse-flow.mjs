import * as chromeLauncher from 'chrome-launcher';
import puppeteer from 'puppeteer-core';
import { startFlow } from 'lighthouse';
import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.TARGET_URL || 'http://localhost:4200';
const IS_HEADLESS = process.env.HEADLESS !== 'false' && !process.argv.includes('--headful');
const OUTPUT_DIR = path.resolve(process.cwd(), '.lighthouseci');

// CLI filter options
const ONLY_DESKTOP = process.argv.includes('--desktop');
const ONLY_MOBILE = process.argv.includes('--mobile');
const ONLY_LIGHT = process.argv.includes('--light');
const ONLY_DARK = process.argv.includes('--dark');
const IS_QUICK = process.argv.includes('--quick');

const RUN_DESKTOP = !ONLY_MOBILE;
const RUN_MOBILE = !ONLY_DESKTOP;
const RUN_LIGHT = !ONLY_DARK;
const RUN_DARK = !ONLY_LIGHT;

const DESKTOP_CONFIG = {
  formFactor: 'desktop',
  screenEmulation: {
    mobile: false,
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    disabled: false,
  },
};

const MOBILE_CONFIG = {
  formFactor: 'mobile',
  screenEmulation: {
    mobile: true,
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    disabled: false,
  },
};

/**
 * Load demo datasets from public/demo/
 */
function loadDemoFiles() {
  const demoDir = path.resolve(process.cwd(), 'public/demo');
  const read = (file) => {
    try {
      return fs.readFileSync(path.join(demoDir, file), 'utf8');
    } catch {
      return '[]';
    }
  };

  return {
    water: read('water-consumption.json'),
    heating: read('heating-consumption.json'),
    heatingSettings: read('heating-settings.json'),
    electricity: read('electricity-consumption.json'),
    family: read('family.json'),
    address: read('address.json'),
    excel: read('excel-settings.json'),
  };
}

/**
 * Injects complete demo datasets into localStorage and marks demo mode active
 */
async function setupDemoMode(page, demoData) {
  await page.evaluate((data) => {
    localStorage.setItem('hm_water_consumption_records', data.water);
    localStorage.setItem('hm_heating_consumption_records', data.heating);
    localStorage.setItem('hm_heating_room_configuration', data.heatingSettings);
    localStorage.setItem('hm_electricity_consumption_records', data.electricity);
    localStorage.setItem('hm_household_members', data.family);
    localStorage.setItem('hm_household_address', data.address);
    localStorage.setItem('hm_excel_settings', data.excel);

    localStorage.setItem('hm_water_chart_view', JSON.stringify('detailed'));
    localStorage.setItem('hm_water_display_mode', JSON.stringify('incremental'));
    localStorage.setItem('hm_heating_chart_view', JSON.stringify('by-room'));
    localStorage.setItem('hm_heating_display_mode', JSON.stringify('incremental'));
    localStorage.setItem('hm_electricity_chart_view', JSON.stringify('detailed'));
    localStorage.setItem('hm_electricity_display_mode', JSON.stringify('incremental'));

    localStorage.setItem('hm_electricity_chart_average_visible', 'true');
    localStorage.setItem('hm_heating_chart_average_visible', 'false');
    localStorage.setItem('hm_water_chart_average_visible', 'true');

    localStorage.setItem('hm_demo_mode_is_active', 'true');
  }, demoData);
}

/**
 * Set theme in localStorage, document element attribute, and prefers-color-scheme
 */
async function applyTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem('hm_theme', t);
    document.documentElement.setAttribute('data-theme', t);
  }, theme);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/**
 * Switch Puppeteer viewport between desktop and mobile
 */
async function setDeviceViewport(page, isMobile) {
  if (isMobile) {
    await page.setViewport({
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
  } else {
    await page.setViewport({
      width: 1280,
      height: 900,
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });
  }
  await new Promise((resolve) => setTimeout(resolve, 300));
}

/**
 * Helper to audit a page view
 */
async function auditPage(flow, page, { url, name, isMobile = false }) {
  console.log(`   📸 Auditing Page: ${name}...`);
  if (url) {
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  const settingsOverrides = isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG;

  await flow.snapshot({
    name,
    stepName: name,
    configContext: { settingsOverrides },
  });
}

/**
 * Helper to audit an interactive modal:
 * 1. Executes trigger or openAction via DOM evaluate to avoid fixed-header interception
 * 2. Waits for modal visibility
 * 3. Runs optional beforeSnapshot hook (e.g. expand dropdown)
 * 4. Captures Lighthouse flow snapshot
 * 5. Closes modal safely via close selector or Escape key
 */
async function auditModal(
  flow,
  page,
  {
    name,
    isMobile = false,
    openAction,
    triggerSelector,
    modalSelector,
    closeSelector,
    beforeSnapshot = null,
  },
) {
  console.log(`   👉 Auditing Modal: ${name}...`);
  try {
    if (typeof openAction === 'function') {
      await openAction(page);
    } else if (triggerSelector) {
      await page.waitForSelector(triggerSelector, { visible: true, timeout: 6000 });
      await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (el) {
          el.scrollIntoView({ block: 'center', inline: 'center' });
          el.click();
        }
      }, triggerSelector);
    }

    await page.waitForSelector(modalSelector, { visible: true, timeout: 6000 });
    await new Promise((resolve) => setTimeout(resolve, 350));

    if (beforeSnapshot) {
      await beforeSnapshot(page);
    }

    const settingsOverrides = isMobile ? MOBILE_CONFIG : DESKTOP_CONFIG;

    await flow.snapshot({
      name,
      stepName: name,
      configContext: { settingsOverrides },
    });

    // Close modal safely
    let closed = false;
    if (closeSelector) {
      const hasClose = await page.evaluate((sel) => !!document.querySelector(sel), closeSelector);
      if (hasClose) {
        await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          if (el) el.click();
        }, closeSelector);
        closed = true;
      }
    }
    if (!closed) {
      await page.keyboard.press('Escape');
    }

    try {
      await page.waitForSelector(modalSelector, { hidden: true, timeout: 3500 });
    } catch {
      await page.keyboard.press('Escape');
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
    console.log(`   ✅ Completed: ${name}`);
  } catch (error) {
    console.warn(`   ⚠️ Warning: Could not complete modal step "${name}":`, error.message);
    await page.keyboard.press('Escape');
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
}

/**
 * Reusable suite covering all primary pages and all 10 interactive modals
 */
async function auditSuite(flow, page, { isMobile, theme, suiteNum, totalSuites, isQuick }) {
  const platformName = isMobile ? 'Mobile' : 'Desktop';
  const themeName = theme === 'dark' ? 'Dark' : 'Light';
  const icon = isMobile ? (theme === 'dark' ? '📱🌙' : '📱☀️') : theme === 'dark' ? '💻🌙' : '💻☀️';

  console.log(
    `\n${icon} [${suiteNum}/${totalSuites}] Auditing ${platformName} - ${themeName} Theme & All Modals...`,
  );

  await setDeviceViewport(page, isMobile);
  await applyTheme(page, theme);

  // 1. Landing Page (included on Light theme or full mode)
  if (theme === 'light' || !isQuick) {
    await auditPage(flow, page, {
      url: `${BASE_URL}/`,
      name: `${icon} Landing Page (${platformName} ${themeName})`,
      isMobile,
    });
  }

  // 2. Dashboard Page
  await auditPage(flow, page, {
    url: `${BASE_URL}/dashboard`,
    name: `${icon} Dashboard Page (${platformName} ${themeName})`,
    isMobile,
  });

  // 3. Modal 1: Contact Modal with Email Dropup open
  await auditModal(flow, page, {
    triggerSelector: '.contact-btn',
    modalSelector: 'app-contact-modal .modal-overlay',
    closeSelector: 'app-contact-modal .close-btn',
    name: `${icon} Contact Modal & Dropup (${platformName} ${themeName})`,
    isMobile,
    beforeSnapshot: async (p) => {
      await p.evaluate(() => {
        const sel = document.querySelector('.custom-select');
        if (sel) sel.click();
      });
      await new Promise((r) => setTimeout(r, 200));
    },
  });

  // 4. Modal 2: Support Modal
  await auditModal(flow, page, {
    triggerSelector: '.donate-link',
    modalSelector: 'app-support-modal .modal-overlay',
    closeSelector: 'app-support-modal .close-btn',
    name: `${icon} Support Modal (${platformName} ${themeName})`,
    isMobile,
  });

  // 5. Water Tracker Page
  await auditPage(flow, page, {
    url: `${BASE_URL}/dashboard/water`,
    name: `${icon} Water Tracker Page (${platformName} ${themeName})`,
    isMobile,
  });

  // 6. Modal 3: Meter Reader Modal
  await auditModal(flow, page, {
    triggerSelector: '.camera-btn',
    modalSelector: 'app-meter-reader-modal .modal-overlay',
    closeSelector: 'app-meter-reader-modal .close-btn',
    name: `${icon} Meter Reader Modal (${platformName} ${themeName})`,
    isMobile,
  });

  // 7. Modal 4: Consumption Help Modal
  await auditModal(flow, page, {
    triggerSelector: 'app-consumption-input .help-btn:not(.camera-btn)',
    modalSelector: 'app-help-modal .modal-overlay',
    closeSelector: 'app-help-modal .close-btn',
    name: `${icon} Consumption Help Modal (${platformName} ${themeName})`,
    isMobile,
  });

  // 8. Modal 5: Demo Tour Modal
  if (!isQuick || theme === 'light') {
    await auditModal(flow, page, {
      triggerSelector: '.demo-tour-btn',
      modalSelector: '.tour-tooltip',
      closeSelector: '.tooltip-close',
      name: `${icon} Demo Tour Modal (${platformName} ${themeName})`,
      isMobile,
    });
  }

  // 9. Heating Tracker Page
  await auditPage(flow, page, {
    url: `${BASE_URL}/dashboard/heating`,
    name: `${icon} Heating Tracker Page (${platformName} ${themeName})`,
    isMobile,
  });

  // 10. Modal 6: Heating Rooms Modal
  await auditModal(flow, page, {
    triggerSelector: '.settings-btn',
    modalSelector: 'app-heating-rooms-modal .modal-overlay',
    closeSelector: 'app-heating-rooms-modal .close-btn',
    name: `${icon} Heating Rooms Modal (${platformName} ${themeName})`,
    isMobile,
  });

  // 11. Electricity Tracker Page
  await auditPage(flow, page, {
    url: `${BASE_URL}/dashboard/electricity`,
    name: `${icon} Electricity Tracker Page (${platformName} ${themeName})`,
    isMobile,
  });

  // 12. Modal 7: Electricity Smart Import Modal
  await auditModal(flow, page, {
    openAction: async (p) => {
      await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await p.waitForSelector('app-detailed-records', { timeout: 5000 });
      await p.evaluate(() => {
        const trigger = document.querySelector('button[aria-label="Import menu"]');
        if (trigger) trigger.click();
      });
      await new Promise((r) => setTimeout(r, 250));
      await p.evaluate(() => {
        const item = document.querySelector('.action-dropdown-item.smart-item');
        if (item) item.click();
      });
    },
    modalSelector: 'app-smart-import-modal .modal-overlay',
    closeSelector: 'app-smart-import-modal .close-btn',
    name: `${icon} Smart Text Import Modal (${platformName} ${themeName})`,
    isMobile,
  });

  // 13. Settings Page
  await auditPage(flow, page, {
    url: `${BASE_URL}/dashboard/settings`,
    name: `${icon} Settings Page (${platformName} ${themeName})`,
    isMobile,
  });

  // 14. Modal 8: Family Add Member Modal
  await auditModal(flow, page, {
    triggerSelector: 'app-family .button-group .add-btn',
    modalSelector: 'app-family .add-member-modal-overlay',
    closeSelector: 'app-family .add-member-modal-overlay .close-btn',
    name: `${icon} Family Add Member Modal (${platformName} ${themeName})`,
    isMobile,
  });

  // 15. Modal 9: Family Edit Member Modal
  if (!isQuick || theme === 'light') {
    await auditModal(flow, page, {
      triggerSelector: 'app-family .action-icon-btn.edit-btn, app-family .edit-btn',
      modalSelector: 'app-family .member-modal-content',
      closeSelector: 'app-family .close-btn',
      name: `${icon} Family Edit Member Modal (${platformName} ${themeName})`,
      isMobile,
    });
  }

  // 16. Modal 10: Family Delete Confirmation Modal
  await auditModal(flow, page, {
    triggerSelector: 'app-family .remove-btn',
    modalSelector: 'app-family app-delete-confirmation-modal .modal-overlay',
    closeSelector: 'app-family app-delete-confirmation-modal .btn-secondary',
    name: `${icon} Delete Confirmation Modal (${platformName} ${themeName})`,
    isMobile,
  });
}

async function runAudit() {
  console.log('================================================================');
  console.log('🚀 Starting Lighthouse Flow: Desktop & Mobile, Themes & Modals');
  console.log('================================================================');
  console.log(`🌐 Base URL:        ${BASE_URL}`);
  console.log(`🕶️ Headless:        ${IS_HEADLESS ? 'Yes' : 'No (Visible Browser)'}`);
  console.log(`💻 Desktop:         ${RUN_DESKTOP ? 'Enabled' : 'Skipped'}`);
  console.log(`📱 Mobile:          ${RUN_MOBILE ? 'Enabled' : 'Skipped'}`);
  console.log(`☀️ Light Theme:     ${RUN_LIGHT ? 'Enabled' : 'Skipped'}`);
  console.log(`🌙 Dark Theme:      ${RUN_DARK ? 'Enabled' : 'Skipped'}`);
  console.log(`⚡ Quick Mode:      ${IS_QUICK ? 'Yes' : 'No'}\n`);

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const chromeFlags = [
    IS_HEADLESS ? '--headless=new' : '',
    '--disable-gpu',
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--window-size=1366,960',
  ].filter(Boolean);

  let chrome;
  let browser;
  try {
    chrome = await chromeLauncher.launch({ chromeFlags });
    const versionResp = await fetch(`http://127.0.0.1:${chrome.port}/json/version`);
    const versionData = await versionResp.json();

    browser = await puppeteer.connect({
      browserWSEndpoint: versionData.webSocketDebuggerUrl,
      defaultViewport: { width: 1280, height: 900 },
    });

    const page = await browser.newPage();

    // 1. Initialize Demo Mode in localStorage
    console.log('📦 Loading Demo Data...');
    const demoData = loadDemoFiles();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
    await setupDemoMode(page, demoData);
    console.log('✅ Demo Mode activated with complete records, settings, and family.\n');

    const flowTitle = ONLY_DESKTOP
      ? `Home Management - Desktop ${ONLY_LIGHT ? 'Light' : ONLY_DARK ? 'Dark' : ''} User Flows`
      : ONLY_MOBILE
        ? `Home Management - Mobile ${ONLY_LIGHT ? 'Light' : ONLY_DARK ? 'Dark' : ''} User Flows`
        : 'Home Management - Desktop/Mobile & All Modals Audit';

    const initialConfig = ONLY_MOBILE ? MOBILE_CONFIG : DESKTOP_CONFIG;

    const flow = await startFlow(page, {
      name: flowTitle,
      config: {
        extends: 'lighthouse:default',
        settings: {
          onlyCategories: ['accessibility', 'best-practices', 'seo'],
          ...initialConfig,
        },
      },
    });

    // Build list of suites to run
    const suites = [];
    if (RUN_DESKTOP && RUN_LIGHT) suites.push({ isMobile: false, theme: 'light' });
    if (RUN_DESKTOP && RUN_DARK) suites.push({ isMobile: false, theme: 'dark' });
    if (RUN_MOBILE && RUN_LIGHT) suites.push({ isMobile: true, theme: 'light' });
    if (RUN_MOBILE && RUN_DARK) suites.push({ isMobile: true, theme: 'dark' });

    if (IS_QUICK && !ONLY_DESKTOP && !ONLY_MOBILE && !ONLY_LIGHT && !ONLY_DARK) {
      // In quick mode without explicit filters, audit Desktop Light and Mobile Dark for full cross-coverage
      suites.length = 0;
      suites.push({ isMobile: false, theme: 'light' });
      suites.push({ isMobile: true, theme: 'dark' });
    }

    for (let i = 0; i < suites.length; i++) {
      const suite = suites[i];
      await auditSuite(flow, page, {
        isMobile: suite.isMobile,
        theme: suite.theme,
        suiteNum: i + 1,
        totalSuites: suites.length,
        isQuick: IS_QUICK,
      });
    }

    // =================================================================
    // 📊 GENERATE REPORT
    // =================================================================
    console.log('\n📝 Compiling Comprehensive Lighthouse User Flow Report...');
    const reportHtml = await flow.generateReport();
    const reportPath = path.join(OUTPUT_DIR, 'lighthouse-userflow-report.html');
    fs.writeFileSync(reportPath, reportHtml, 'utf8');

    const suiteTag =
      ONLY_DESKTOP && ONLY_LIGHT
        ? '-desktop-light'
        : ONLY_DESKTOP && ONLY_DARK
          ? '-desktop-dark'
          : ONLY_MOBILE && ONLY_LIGHT
            ? '-mobile-light'
            : ONLY_MOBILE && ONLY_DARK
              ? '-mobile-dark'
              : '';

    if (suiteTag) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `lighthouse-userflow${suiteTag}-report.html`),
        reportHtml,
        'utf8',
      );
    }

    const flowResult = await flow.createFlowResult();
    const summary = flowResult.steps.map((step) => {
      const isMob = step.name.includes('📱') || step.name.toLowerCase().includes('mobile');
      const isDk = step.name.includes('🌙') || step.name.toLowerCase().includes('dark');

      return {
        Step: step.name,
        Platform: isMob ? 'Mobile' : 'Desktop',
        Theme: isDk ? 'Dark' : 'Light',
        Accessibility: step.lhr.categories?.accessibility
          ? Math.round(step.lhr.categories.accessibility.score * 100)
          : 'N/A',
        'Best Practices': step.lhr.categories?.['best-practices']
          ? Math.round(step.lhr.categories['best-practices'].score * 100)
          : 'N/A',
        SEO: step.lhr.categories?.seo ? Math.round(step.lhr.categories.seo.score * 100) : 'N/A',
      };
    });

    const summaryPath = path.join(OUTPUT_DIR, 'lighthouse-userflow-summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
    if (suiteTag) {
      fs.writeFileSync(
        path.join(OUTPUT_DIR, `lighthouse-userflow${suiteTag}-summary.json`),
        JSON.stringify(summary, null, 2),
        'utf8',
      );
    }

    console.log('\n================================================================');
    console.log('🎉 AUDIT COMPLETE!');
    console.log('================================================================');
    console.log(`📄 Full HTML Report:  file://${reportPath}`);
    console.log(`📊 Summary JSON:      file://${summaryPath}`);
    console.log('================================================================\n');
    console.table(summary);
  } catch (err) {
    console.error('❌ Audit encountered an error:', err);
    process.exitCode = 1;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch {
        // Ignore close error
      }
    }
    if (chrome) {
      try {
        await chrome.kill();
      } catch {
        // Ignore kill error
      }
    }
  }
}

runAudit().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
