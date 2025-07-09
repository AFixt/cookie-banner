/**
 * Playwright configuration for visual regression testing
 */

import { devices } from '@playwright/test';

export default {
  testDir: './test',
  testMatch: '**/visual-*.test.js',
  timeout: 60 * 1000, // Longer timeout for screenshot operations
  expect: {
    timeout: 10000, // Longer timeout for visual comparisons
    // Configure visual comparison thresholds
    toMatchSnapshot: {
      threshold: 0.2, // Allow 20% difference for visual comparisons
      maxDiffPixels: 1000
    }
  },
  fullyParallel: false, // Run visual tests sequentially for consistency
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1, // Single worker for consistent rendering
  reporter: [
    ['html', { outputFolder: 'playwright-visual-report' }],
    ['junit', { outputFile: 'test-results/visual-regression-results.xml' }]
  ],
  use: {
    // Disable animations for consistent screenshots
    reducedMotion: 'reduce',
    // Consistent viewport for screenshots
    viewport: { width: 1280, height: 720 },
    // Always take screenshots
    screenshot: 'only-on-failure',
    // Disable videos to save space
    video: 'off',
    // Wait for network to be idle for consistent rendering
    waitForLoadState: 'networkidle',
    // Consistent font rendering
    fontFamily: 'Arial, sans-serif'
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        reducedMotion: 'reduce',
        // Force consistent font rendering
        fontFamily: 'Arial, sans-serif'
      },
    },
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5'],
        reducedMotion: 'reduce'
      },
    }
  ],

  webServer: process.env.CI ? undefined : {
    command: 'npm run serve',
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
};