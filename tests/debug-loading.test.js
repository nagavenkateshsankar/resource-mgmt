const { test, expect } = require('@playwright/test');

test.describe('Debug Loading Issue', () => {
  test('check what elements are visible on page load', async ({ page }) => {
    // Mock auth profile to return 401 (unauthenticated)
    await page.route('**/api/v1/auth/profile', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      });
    });

    await page.goto('/');
    
    // Wait a bit for app initialization
    await page.waitForTimeout(3000);
    
    // Debug: Check what elements are present
    const loadingScreen = page.locator('#loading-screen');
    const loginScreen = page.locator('#login-screen');
    const appContainer = page.locator('#app');
    const body = page.locator('body');
    
    console.log('Loading screen visible:', await loadingScreen.isVisible().catch(() => false));
    console.log('Login screen visible:', await loginScreen.isVisible().catch(() => false));
    console.log('App container visible:', await appContainer.isVisible().catch(() => false));
    
    // Get the inner HTML to see what's actually on the page
    const bodyHTML = await body.innerHTML();
    console.log('Page HTML contains loading-screen:', bodyHTML.includes('loading-screen'));
    console.log('Page HTML contains login-screen:', bodyHTML.includes('login-screen'));
    
    // Check current URL
    console.log('Current URL:', page.url());
    
    // Check console errors
    const consoleMessages = [];
    page.on('console', msg => consoleMessages.push(msg.text()));
    
    await page.waitForTimeout(1000);
    console.log('Console messages:', consoleMessages);
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-loading-screenshot.png' });
  });
});