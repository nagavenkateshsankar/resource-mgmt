import { test, expect } from '@playwright/test';

test('Login and test inspection creation', async ({ page }) => {
  try {
    // Navigate to the login page
    console.log('→ Navigating to login page');
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('body', { timeout: 10000 });

    // Fill login form and submit
    console.log('→ Filling login form');
    await page.fill('input[type="email"]', 'admin@testorg.com');
    await page.fill('input[type="password"]', 'password123');

    // Click login button
    const loginButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")');
    await loginButton.click();

    // Wait for redirect after login
    console.log('→ Waiting for login redirect');
    await page.waitForURL(/\/dashboard|\/inspections/, { timeout: 10000 });
    console.log('✓ Login successful');

    // Now navigate to inspection creation
    console.log('→ Navigating to /inspections/new');
    await page.goto('http://localhost:5173/inspections/new');

    // Wait for page load
    await page.waitForTimeout(3000);

    // Check the URL to confirm we're on the right page
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);

    // Check page content
    const pageContent = await page.content();

    // Look for specific text that indicates which component loaded
    if (pageContent.includes('Create New Inspection')) {
      console.log('✓ InspectionCreate component loaded');
    } else if (pageContent.includes('Error Loading Template')) {
      console.log('✗ InspectionForm component loaded (wrong component)');
    } else if (pageContent.includes('Template ID is required')) {
      console.log('✗ InspectionForm component loaded with template ID error');
    } else {
      console.log('? Unknown component loaded');
      console.log('Page content sample:', pageContent.substring(0, 1000));
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/login-create-test.png', fullPage: true });
    console.log('Screenshot saved to /tmp/login-create-test.png');

  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: '/tmp/error-screenshot.png' });
    throw error;
  }
});