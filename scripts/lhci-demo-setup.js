const fs = require('fs');
const path = require('path');

/**
 * Puppeteer setup script for Lighthouse CI (LHCI).
 * Injects complete demo datasets into localStorage before LHCI runs audits.
 */
async function setup(browser, context) {
  const page = await browser.newPage();
  const demoDir = path.resolve(process.cwd(), 'public/demo');

  const read = (file) => {
    try {
      return fs.readFileSync(path.join(demoDir, file), 'utf8');
    } catch {
      return '[]';
    }
  };

  const demoData = {
    water: read('water-consumption.json'),
    heating: read('heating-consumption.json'),
    heatingSettings: read('heating-settings.json'),
    electricity: read('electricity-consumption.json'),
    family: read('family.json'),
    address: read('address.json'),
    excel: read('excel-settings.json'),
  };

  const targetUrl = context.url || 'http://localhost:4000/';
  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
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

      localStorage.setItem('hm_demo_mode_is_active', 'true');
    }, demoData);
  } catch (err) {
    console.warn('LHCI Demo setup warning:', err.message);
  } finally {
    await page.close();
  }
}

module.exports = setup;
module.exports.default = setup;
