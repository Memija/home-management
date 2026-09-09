const { Launcher } = require('chrome-launcher');

let chromePath = process.env.CHROME_PATH;
if (!chromePath) {
  try {
    chromePath = Launcher.getFirstInstallation();
  } catch {
    // Fallback if launcher throws
  }
}

/** @type {import('@lhci/cli').LhciConfig} */
module.exports = {
  ci: {
    collect: {
      ...(chromePath ? { chromePath } : {}),
      startServerCommand: 'npm run serve:ssr:home-management',
      startServerReadyPattern: 'Node Express server listening',
      startServerReadyTimeout: 30000,
      url: [
        'http://localhost:4000/',
        'http://localhost:4000/dashboard',
        'http://localhost:4000/dashboard/water',
        'http://localhost:4000/dashboard/heating',
        'http://localhost:4000/dashboard/electricity',
        'http://localhost:4000/dashboard/release-plan',
        'http://localhost:4000/dashboard/changelog',
        'http://localhost:4000/dashboard/privacy',
        'http://localhost:4000/dashboard/settings',
      ],
      numberOfRuns: 1,
      puppeteerScript: 'scripts/lhci-demo-setup.js',
      settings: {
        chromeFlags: '--no-sandbox --headless=new --disable-gpu --disable-dev-shm-usage',
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci',
    },
  },
};
