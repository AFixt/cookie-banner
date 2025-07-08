/**
 * Playwright configuration for accessibility testing
 */

import { devices } from '@playwright/test';

export default {
  testDir: './test',
  testMatch: '**/accessibility-*.test.js',
  timeout: 30 * 1000,
  expect: {
    timeout: 5000
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/accessibility-results.xml' }]
  ],
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },

  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Force reduced motion for consistent testing
        reducedMotion: 'reduce'
      },
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        reducedMotion: 'reduce'
      },
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        reducedMotion: 'reduce'
      },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        reducedMotion: 'reduce'
      },
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12'],
        reducedMotion: 'reduce'
      },
    },
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run serve',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
};