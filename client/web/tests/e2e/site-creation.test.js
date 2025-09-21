import { test, expect } from '@playwright/test';

test('Site creation functionality', async ({ page }) => {
  console.log('Starting site creation test...');

  // Navigate to the login page
  await page.goto('http://localhost:5173/login');
  await expect(page).toHaveTitle(/Site Inspector/);

  console.log('Logging in...');
  // Login with test credentials
  await page.fill('input[type="email"]', 'admin@resourcemgmt.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');

  // Wait for successful login and redirect
  await expect(page).toHaveURL(/dashboard/, { timeout: 10000 });
  console.log('Logged in successfully');

  // Navigate to sites page
  await page.goto('http://localhost:5173/sites');
  await expect(page.locator('h1:has-text("Sites")')).toBeVisible();
  console.log('Navigated to sites page');

  // Check if there's a "New Site" button
  await expect(page.locator('text="New Site"')).toBeVisible({ timeout: 5000 });

  // Click the create site button
  await page.locator('text="New Site"').click();
  console.log('Clicked create site button');

  // Should navigate to the new site form
  await expect(page).toHaveURL(/sites\/new/, { timeout: 5000 });
  console.log('Navigated to new site form');

  // Fill out the site form
  await page.fill('input[name="name"]', 'Test Site Location');
  await page.fill('input[name="address"]', '123 Test Street');
  await page.fill('input[name="city"]', 'Test City');
  await page.fill('input[name="state"]', 'Test State');
  await page.fill('input[name="zip_code"]', '12345');
  await page.fill('input[name="contact_name"]', 'Test Contact');
  await page.fill('input[name="contact_email"]', 'contact@testsite.com');
  await page.fill('input[name="contact_phone"]', '555-0123');

  console.log('Filled out site form');

  // Submit the form
  await page.click('button[type="submit"]');
  console.log('Submitted site form');

  // Wait for success indication - either redirect to sites list or success message
  try {
    // Try to wait for redirect to sites list
    await expect(page).toHaveURL(/sites$/, { timeout: 10000 });
    console.log('Successfully redirected to sites list');

    // Check if the new site appears in the list
    await expect(page.locator('text="Test Site Location"')).toBeVisible({ timeout: 5000 });
    console.log('New site appears in the list');

  } catch (error) {
    console.log('Checking for error messages...');

    // Check for any error messages on the page
    const errorMessages = await page.locator('[class*="error"], .alert-error, [role="alert"]').allTextContents();
    if (errorMessages.length > 0) {
      console.error('Error messages found:', errorMessages);
    }

    // Take a screenshot for debugging
    await page.screenshot({ path: 'site-creation-error.png', fullPage: true });
    console.log('Screenshot saved: site-creation-error.png');

    // Check network responses for API errors
    page.on('response', response => {
      if (response.url().includes('/api/') && !response.ok()) {
        console.error(`API Error: ${response.status()} ${response.url()}`);
      }
    });

    throw error;
  }
});