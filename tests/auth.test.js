const { test, expect } = require('@playwright/test');

test.describe('Authentication Flow @smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('displays login screen by default', async ({ page }) => {
    await expect(page.locator('#login-screen')).toBeVisible();
    await expect(page.locator('#login-form')).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });

  test('shows validation error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('#login-btn');
    
    await expect(page.locator('.notification.error')).toBeVisible();
  });

  test('successful login redirects to dashboard', async ({ page }) => {
    // Mock successful login
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', name: 'Test User', role: 'admin' },
          token: 'test-token'
        })
      });
    });

    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('#login-btn');

    await expect(page.locator('#app')).toBeVisible();
    await expect(page.locator('#dashboard-page')).toHaveClass(/active/);
  });

  test('logout functionality works', async ({ page }) => {
    // First login
    await page.route('**/api/v1/auth/login', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: '1', name: 'Test User', role: 'admin' },
          token: 'test-token'
        })
      });
    });

    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('#login-btn');

    // Then logout
    await page.click('#logout-btn');
    
    // Confirm logout dialog
    page.on('dialog', dialog => dialog.accept());
    
    await expect(page.locator('#login-screen')).toBeVisible();
  });
});