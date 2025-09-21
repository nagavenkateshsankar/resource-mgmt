const { test, expect } = require('@playwright/test');

test.describe('Debug Auth Flow', () => {
  test('monitor authentication API calls', async ({ page }) => {
    // Monitor all API requests
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
      }
    });

    // Monitor console logs and errors
    const consoleLogs = [];
    const jsErrors = [];
    
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text(),
        timestamp: Date.now()
      });
    });
    
    page.on('pageerror', error => {
      jsErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
    });

    // Mock the auth profile endpoint to return 401
    await page.route('**/api/v1/auth/profile', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    await page.goto('/');
    
    // Wait for a reasonable time for initialization
    await page.waitForTimeout(5000);
    
    console.log('\n--- API CALLS ---');
    apiCalls.forEach(call => {
      console.log(`${call.method} ${call.url.split('/api/')[1]}`);
    });
    
    console.log('\n--- CONSOLE LOGS ---');
    consoleLogs.forEach(log => {
      if (log.type === 'error' || log.text.includes('auth') || log.text.includes('User') || log.text.includes('init')) {
        console.log(`[${log.type}] ${log.text}`);
      }
    });
    
    console.log('\n--- JS ERRORS ---');
    jsErrors.forEach(error => {
      console.log(`ERROR: ${error.message}`);
    });
    
    // Check if auth/profile was called
    const authProfileCalls = apiCalls.filter(call => call.url.includes('/auth/profile'));
    console.log(`\nAuth profile calls: ${authProfileCalls.length}`);
    
    // Check current page state
    const loadingVisible = await page.locator('#loading-screen').isVisible();
    const currentUrl = page.url();
    
    console.log(`Loading screen visible: ${loadingVisible}`);
    console.log(`Current URL: ${currentUrl}`);
    
    // Take screenshot
    await page.screenshot({ path: 'debug-auth-screenshot.png' });
  });
});