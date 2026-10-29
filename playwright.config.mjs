import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  outputDir: '/private/tmp/tramo-embed-results',
  use: { baseURL: 'http://127.0.0.1:3100', channel: 'chrome', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node tests/e2e/api.mjs', url: 'http://127.0.0.1:3180/health', reuseExistingServer: false },
    { command: 'node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1 --port 3100', url: 'http://127.0.0.1:3100/login', timeout: 120000,
      env: { API_BASE_URL: 'http://127.0.0.1:3180', BFF_SIGNING_KEY: '', PLAYWRIGHT_TEST: '1' }, reuseExistingServer: false },
  ],
});
