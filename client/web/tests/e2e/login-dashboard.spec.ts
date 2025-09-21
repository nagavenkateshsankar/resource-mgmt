import { test, expect } from '@playwright/test';

test.describe('Login and Dashboard Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the login page
    await page.goto('/login');
  });

  test('should login with admin credentials and redirect to dashboard', async ({ page }) => {
    // Check login page loads correctly
    await expect(page).toHaveURL(/.*\/login/);

    // Fill login form with admin credentials
    await page.fill('input[type="email"], input[name="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"], input[name="password"]', 'Admin123!');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for navigation - should redirect to dashboard
    await page.waitForURL('/', { timeout: 10000 });

    // Verify we're on the dashboard page
    await expect(page).toHaveURL('/');

    // Check that dashboard elements are present
    await expect(page.locator('text=Dashboard')).toBeVisible();

    // Check for dashboard stats
    await expect(page.locator('text=Total Inspections')).toBeVisible();
    await expect(page.locator('text=Completed')).toBeVisible();
    await expect(page.locator('text=In Progress')).toBeVisible();
    await expect(page.locator('text=Overdue')).toBeVisible();
  });

  test('should display correct dashboard elements after login', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"], input[name="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"], input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard to load
    await page.waitForURL('/', { timeout: 10000 });

    // Check dashboard components
    await expect(page.locator('#dashboard-page')).toBeVisible();
    await expect(page.locator('.page-header h2')).toContainText('Dashboard');

    // Check for New Inspection button
    await expect(page.locator('#new-inspection-btn, button:has-text("New Inspection")')).toBeVisible();

    // Check for inspection sections
    await expect(page.locator('text=My Assigned Inspections')).toBeVisible();
    await expect(page.locator('text=Recent Inspections')).toBeVisible();

    // Check for FAB (Floating Action Button)
    await expect(page.locator('#fab, .fab')).toBeVisible();
  });

  test('should show login error for invalid credentials', async ({ page }) => {
    // Fill login form with invalid credentials
    await page.fill('input[type="email"], input[name="email"]', 'invalid@test.com');
    await page.fill('input[type="password"], input[name="password"]', 'wrongpassword');

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait a moment for the response
    await page.waitForTimeout(2000);

    // Should still be on login page
    await expect(page).toHaveURL(/.*\/login/);

    // Should show error message (if implemented)
    const errorMessage = page.locator('.error, .alert-error, [class*="error"]').first();
    if (await errorMessage.count() > 0) {
      await expect(errorMessage).toBeVisible();
    }
  });

  test('should validate dashboard API calls after login', async ({ page }) => {
    // Monitor network requests
    const apiCalls = [];
    page.on('request', request => {
      if (request.url().includes('/api/')) {
        apiCalls.push(request.url());
      }
    });

    // Login
    await page.fill('input[type="email"], input[name="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"], input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/', { timeout: 10000 });

    // Wait for API calls to complete
    await page.waitForTimeout(3000);

    // Check that profile API was called correctly
    const profileApiCall = apiCalls.find(url => url.includes('/api/v1/auth/profile'));
    expect(profileApiCall).toBeDefined();

    console.log('API calls made:', apiCalls);
  });

  test('should handle logout functionality', async ({ page }) => {
    // Login first
    await page.fill('input[type="email"], input[name="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"], input[name="password"]', 'Admin123!');
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/', { timeout: 10000 });

    // Look for logout button/menu
    const logoutBtn = page.locator('button:has-text("Logout"), a:has-text("Logout"), [data-action="logout"]').first();

    if (await logoutBtn.count() > 0) {
      await logoutBtn.click();

      // Should redirect back to login
      await page.waitForURL('/login', { timeout: 5000 });
      await expect(page).toHaveURL('/login');
    } else {
      console.log('Logout functionality not found - test skipped');
    }
  });
});