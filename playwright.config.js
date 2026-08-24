const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: 'http://127.0.0.1:8742', trace: 'off', video: 'off' },
  webServer: {
    command: 'python3 -m http.server 8742 --bind 127.0.0.1',
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
