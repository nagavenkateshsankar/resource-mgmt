import { test, expect } from '@playwright/test';

test.describe('Assignments Navigation and Page Verification', () => {
  test('verify assignments navigation appears for admin user and page loads', async ({ page }) => {
    // Navigate to the login page
    await page.goto('http://localhost:5173/login');

    // Login as admin user
    await page.fill('input[type="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');

    // Wait for login to complete and redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Wait for navigation to be visible
    await page.waitForSelector('.app-navigation', { timeout: 5000 });

    // Check if the assignments navigation item is visible
    const assignmentsNav = page.locator('.app-navigation a[href="/assignments"]');
    await expect(assignmentsNav).toBeVisible();

    // Verify the assignments nav has the correct label
    await expect(assignmentsNav).toContainText('Assignments');

    // Click on the assignments navigation
    await assignmentsNav.click();

    // Wait for navigation to assignments page
    await page.waitForURL('**/assignments', { timeout: 10000 });

    // Verify we're on the assignments page by checking for assignment dashboard components
    const assignmentContent = page.locator('[data-testid="assignment-dashboard"], .assignment-dashboard, h1:has-text("Assignments")');
    await expect(assignmentContent.first()).toBeVisible({ timeout: 10000 });

    console.log('✅ Assignments navigation item is visible and page loads successfully');
  });

  test('verify assignments URL can be accessed directly', async ({ page }) => {
    // First login to establish session
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"]', 'SecurePass123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Now try to access assignments directly
    await page.goto('http://localhost:5173/assignments');

    // Verify the page loads without errors
    const pageTitle = page.locator('h1, .page-title, [data-testid="page-title"]');
    await expect(pageTitle.first()).toBeVisible({ timeout: 10000 });

    console.log('✅ Assignments page can be accessed directly via URL');
  });
});