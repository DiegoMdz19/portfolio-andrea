// @ts-check
import 'dotenv/config';
import { config as loadEnv } from 'dotenv';
import { defineConfig, devices } from '@playwright/test';

// Credenciales de prueba locales, nunca versionadas (ver .gitignore).
loadEnv({ path: '.env.test.local' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: 1,
  timeout: 45000,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'retain-on-failure',
    navigationTimeout: 30000,
  },
  webServer: {
    command: 'npm run preview -- --port 4321',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
