const { test, expect } = require('@playwright/test');

test.describe('Navigation Dropdown Behavior', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');

    // Login as admin
    await page.fill('input[type="email"]', 'admin@test.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard');
    await page.waitForTimeout(1000);
  });

  test('manage dropdown should close when clicking outside', async ({ page }) => {
    // Find and click the Manage dropdown trigger
    const manageButton = page.locator('.nav-dropdown .dropdown-trigger').filter({ hasText: 'Manage' });
    await expect(manageButton).toBeVisible();

    // Click to open dropdown
    await manageButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Verify dropdown is open
    const dropdown = page.locator('.dropdown-content');
    await expect(dropdown).toBeVisible();

    // Click outside the dropdown (on the dashboard title)
    await page.click('h1:has-text("Welcome back")');

    // Wait a moment for the click outside handler
    await page.waitForTimeout(300);

    // Verify dropdown is closed
    await expect(dropdown).not.toBeVisible();
  });

  test('manage dropdown should close when selecting an item', async ({ page }) => {
    // Find and click the Manage dropdown trigger
    const manageButton = page.locator('.nav-dropdown .dropdown-trigger').filter({ hasText: 'Manage' });

    // Click to open dropdown
    await manageButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Verify dropdown is open
    const dropdown = page.locator('.dropdown-content');
    await expect(dropdown).toBeVisible();

    // Click on Sites option
    await page.click('.dropdown-item:has-text("Sites")');

    // Wait for navigation
    await page.waitForTimeout(500);

    // Verify dropdown is closed (should not be visible anymore)
    await expect(dropdown).not.toBeVisible();

    // Verify navigation occurred
    await expect(page).toHaveURL('**/sites');
  });

  test('dropdown should not close when clicking inside dropdown content', async ({ page }) => {
    // Find and click the Manage dropdown trigger
    const manageButton = page.locator('.nav-dropdown .dropdown-trigger').filter({ hasText: 'Manage' });

    // Click to open dropdown
    await manageButton.click();

    // Wait for dropdown to open
    await page.waitForTimeout(500);

    // Verify dropdown is open
    const dropdown = page.locator('.dropdown-content');
    await expect(dropdown).toBeVisible();

    // Click inside the dropdown content but not on a link (should not close)
    await dropdown.click({ position: { x: 50, y: 20 } });

    // Wait a moment
    await page.waitForTimeout(300);

    // Verify dropdown is still open
    await expect(dropdown).toBeVisible();
  });
});