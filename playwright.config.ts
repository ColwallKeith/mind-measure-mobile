import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Visual Regression Testing
 * 
 * Run tests: npx playwright test
 * Update snapshots: npx playwright test --update-snapshots
 * Show report: npx playwright show-report
 */
export default defineConfig({
  testDir: './tests',
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Reporter to use
  reporter: [
    ['html'],
    ['list'],
  ],
  
  // Shared settings for all projects
  use: {
    // Base URL for tests
    baseURL: 'http://localhost:5173',
    
    // Collect trace on failure
    trace: 'on-first-retry',
    
    // Take screenshot on failure
    screenshot: 'only-on-failure',
    
    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Mobile viewport for iOS testing
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 13 Pro'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});










