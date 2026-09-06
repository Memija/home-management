const { Launcher } = require('chrome-launcher');

let chromePath = process.env.CHROME_PATH;
if (!chromePath) {
  try {
    chromePath = Launcher.getFirstInstallation();
  } catch {
    // Fallback if launcher throws
  }
}

module.exports = {
  ci: {
    collect: {
      chromePath,
      startServerCommand: 'npm run serve:ssr:home-management',
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
    },
    upload: {
      target: 'filesystem',
      outputDir: './.lighthouseci/mobile',
    },
  },
};
