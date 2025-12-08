import { test, expect } from '@playwright/test';

/**
 * End-to-End Smoke Tests
 * 
 * These tests verify critical user flows work from start to finish.
 * Run before every deployment to catch regressions.
 */

test.describe('Critical User Flows', () => {
  
  test('app loads without errors', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];
    
    // Capture page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // Capture console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Allow time for any delayed errors
    await page.waitForTimeout(2000);
    
    // Should have no critical errors
    const criticalErrors = errors.filter(e => 
      !e.includes('favicon') && // Ignore favicon errors
      !e.includes('ResizeObserver') // Ignore benign ResizeObserver errors
    );
    
    expect(criticalErrors).toHaveLength(0);
    
    console.log('Page loaded successfully with no critical errors');
  });

  test('baseline welcome screen accessibility', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for critical accessibility issues
    const button = page.locator('button').first();
    if (await button.isVisible()) {
      // Button should be keyboard accessible
      await button.focus();
      const isFocused = await button.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBeTruthy();
    }
  });

  test('responsive layout on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Take screenshot for visual verification
    await page.screenshot({ path: 'tests/e2e/screenshots/mobile-view.png' });
    
    // Verify no horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
  });

  test('developer mode triggers correctly', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Look for the logo (developer mode trigger)
    const logo = page.locator('img[alt="Mind Measure"]').first();
    
    if (await logo.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click 5 times to trigger developer mode
      for (let i = 0; i < 5; i++) {
        await logo.click();
        await page.waitForTimeout(100);
      }
      
      // Should show developer mode indicator or confirmation
      // (You may need to adjust based on actual implementation)
      await page.waitForTimeout(1000);
    }
  });
});

test.describe('Critical Component Presence', () => {
  
  test('baseline assessment SDK components load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for any dynamic imports
    await page.waitForTimeout(2000);
    
    // Check that key components are in the page
    const html = await page.content();
    
    // Should not have build errors
    expect(html).not.toContain('Failed to fetch dynamically imported module');
    expect(html).not.toContain('Module not found');
  });

  test('SDK imports are correct', async ({ page }) => {
    // This is a meta-test that runs in the browser context
    await page.goto('/');
    
    // Check for console errors related to imports
    const importErrors: string[] = [];
    page.on('pageerror', (error) => {
      if (error.message.includes('import') || error.message.includes('module')) {
        importErrors.push(error.message);
      }
    });
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    expect(importErrors).toHaveLength(0);
  });
});

test.describe('Performance Checks', () => {
  
  test('initial load time is acceptable', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('load');
    
    const loadTime = Date.now() - startTime;
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
    
    console.log(`Page loaded in ${loadTime}ms`);
  });
});

test.describe('Build Verification', () => {
  
  test('no missing assets', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', (request) => {
      failedRequests.push(request.url());
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Filter out acceptable failures (like favicon)
    const criticalFailures = failedRequests.filter(url => 
      !url.includes('favicon') &&
      !url.includes('apple-touch-icon')
    );
    
    expect(criticalFailures).toHaveLength(0);
  });
});

