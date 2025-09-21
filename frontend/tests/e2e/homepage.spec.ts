import { test, expect } from '@playwright/test';

test.describe('Site Inspector Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Check page title
    await expect(page).toHaveTitle('Site Inspector');

    // Check main heading
    await expect(page.locator('h1')).toContainText('Site Inspector');

    // Check subtitle
    await expect(page.locator('.hero-subtitle')).toContainText('Professional site inspection management made simple');

    // Check navigation buttons exist
    await expect(page.locator('text=Get Started')).toBeVisible();
    await expect(page.locator('text=Sign Up')).toBeVisible();
  });

  test('should display key features section', async ({ page }) => {
    await page.goto('/');

    // Check features section
    await expect(page.locator('h2:has-text("Key Features")')).toBeVisible();

    // Check individual feature cards
    await expect(page.locator('text=Digital Inspections')).toBeVisible();
    await expect(page.locator('text=Offline Support')).toBeVisible();
    await expect(page.locator('text=Photo Documentation')).toBeVisible();
    await expect(page.locator('text=Report Generation')).toBeVisible();
    await expect(page.locator('text=Team Collaboration')).toBeVisible();
    await expect(page.locator('text=Analytics Dashboard')).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click Get Started button
    await page.locator('text=Get Started').click();

    // Should navigate to login page
    await expect(page).toHaveURL('/login');
    await expect(page.locator('h1')).toContainText('Site Inspector');
    await expect(page.locator('text=Sign in to your account')).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');

    // Click Sign Up button
    await page.locator('text=Sign Up').click();

    // Should navigate to register page
    await expect(page).toHaveURL('/register');
    await expect(page.locator('h1')).toContainText('Site Inspector');
    await expect(page.locator('text=Create your account')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that content is still visible and accessible on mobile
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('.hero-subtitle')).toBeVisible();
    await expect(page.locator('text=Get Started')).toBeVisible();

    // Check responsive layout
    const heroActions = page.locator('.hero-actions');
    await expect(heroActions).toBeVisible();
  });

  test('should have proper meta tags for PWA', async ({ page }) => {
    await page.goto('/');

    // Check PWA meta tags
    const viewport = page.locator('meta[name="viewport"]');
    await expect(viewport).toHaveAttribute('content', 'width=device-width, initial-scale=1.0');

    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#2563eb');

    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', 'Site Inspection Manager - Professional PWA for site inspections and safety management');

    // Check Apple Touch Icon
    const appleIcon = page.locator('link[rel="apple-touch-icon"]');
    await expect(appleIcon).toHaveAttribute('href', '/icons/icon-192x192.png');
  });
});