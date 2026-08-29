const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  // The homepage pulls GSAP, Three.js, fonts and 16 clips per navigation; three
  // workers starve each other on one machine and produce false failures.
  workers: process.env.CI ? 2 : 2,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:8742', trace: 'off', video: 'off' },
  webServer: {
    // threaded + gzip: the single-threaded http.server starved parallel workers
    command: 'python3 scripts/serve-gzip.py 8742',
    url: 'http://127.0.0.1:8742/index.html',
    reuseExistingServer: true,
    timeout: 20000
  },
  projects: [
    { name: 'desktop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
    { name: 'desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'tablet-768',   use: { ...devices['Desktop Chrome'], viewport: { width: 768,  height: 1024 } } },
    { name: 'mobile-390',   use: { ...devices['Desktop Chrome'], viewport: { width: 390,  height: 844 }, hasTouch: true, isMobile: false } }
  ]
});
