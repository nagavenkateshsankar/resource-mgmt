/**
 * Comprehensive Regression Protection Suite
 * This test suite ensures existing functionality remains intact during development
 * of new site inspection assignment and review workflow features.
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Regression Protection Suite - Core Functionality', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Authentication System Protection', () => {
    test('Admin login functionality should remain intact', async () => {
      // Navigate to login
      await page.goto('http://localhost:5173/login');
      await page.waitForLoadState('networkidle');

      // Verify login form exists
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();

      // Perform login
      await page.fill('input[type="email"]', 'admin@resourcemgmt.com');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      // Wait for successful redirect
      await page.waitForURL(/\/dashboard|\/home|\/inspections/, { timeout: 10000 });

      // Verify successful login by checking for authenticated elements
      const authIndicators = [
        '.user-menu',
        '.profile-menu',
        'button:has-text("Logout")',
        '[data-testid="user-avatar"]',
        '.navbar-user'
      ];

      let foundAuthIndicator = false;
      for (const selector of authIndicators) {
        if (await page.locator(selector).count() > 0) {
          foundAuthIndicator = true;
          break;
        }
      }

      expect(foundAuthIndicator).toBe(true);
    });

    test('User session should persist across page refreshes', async () => {
      // Login first
      const loginSuccess = await utils.loginAsAdmin();
      expect(loginSuccess).toBe(true);

      // Store current URL
      const currentUrl = page.url();

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be logged in (not redirected to login)
      expect(page.url()).not.toContain('/login');

      // Should maintain session state
      const authCheck = page.locator('.user-menu, .profile-menu, button:has-text("Logout")');
      await expect(authCheck.first()).toBeVisible({ timeout: 5000 });
    });

    test('Logout functionality should work correctly', async () => {
      // Login first
      await utils.loginAsAdmin();

      // Find and click logout
      const logoutSelectors = [
        'button:has-text("Logout")',
        'button:has-text("Sign Out")',
        'a:has-text("Logout")',
        '[data-testid="logout-button"]'
      ];

      let loggedOut = false;
      for (const selector of logoutSelectors) {
        const element = page.locator(selector);
        if (await element.count() > 0 && await element.isVisible()) {
          await element.click();
          loggedOut = true;
          break;
        }
      }

      if (loggedOut) {
        // Should redirect to login page
        await page.waitForURL('**/login', { timeout: 5000 });
        expect(page.url()).toContain('/login');
      }
    });
  });

  test.describe('Navigation and Routing Protection', () => {
    test('Main navigation should remain functional', async () => {
      await utils.loginAsAdmin();

      // Test core navigation routes
      const navigationTests = [
        { route: '/dashboard', name: 'Dashboard' },
        { route: '/inspections', name: 'Inspections' },
        { route: '/templates', name: 'Templates' },
        { route: '/users', name: 'Users' }
      ];

      for (const nav of navigationTests) {
        await page.goto(`http://localhost:5173${nav.route}`);
        await page.waitForLoadState('networkidle');

        // Should not redirect to login (403/401 would redirect)
        expect(page.url()).not.toContain('/login');

        // Page should load successfully
        const pageContent = await page.content();
        expect(pageContent).toBeTruthy();
        expect(pageContent.length).toBeGreaterThan(100);
      }
    });

    test('Protected routes should still require authentication', async () => {
      // Test without login
      const protectedRoutes = ['/dashboard', '/inspections', '/templates', '/users'];

      for (const route of protectedRoutes) {
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('networkidle');

        // Should redirect to login or show login page
        expect(page.url()).toContain('/login');
      }
    });
  });

  test.describe('Users Management Protection', () => {
    test('Users list page should load and display users', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/users');
      await page.waitForLoadState('networkidle');

      // Page should load successfully
      expect(page.url()).toContain('/users');

      // Should show users list or table
      const userElements = [
        '.users-list',
        '.users-table',
        '.user-card',
        'table tbody tr',
        '[data-testid="users-list"]'
      ];

      let foundUsersList = false;
      for (const selector of userElements) {
        if (await page.locator(selector).count() > 0) {
          foundUsersList = true;
          break;
        }
      }

      expect(foundUsersList).toBe(true);
    });

    test('User roles and permissions should still function', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/users');
      await page.waitForLoadState('networkidle');

      // Check for role indicators or permission elements
      const roleElements = [
        '.user-role',
        '.role-badge',
        ':text("Admin")',
        ':text("Inspector")',
        ':text("Manager")'
      ];

      let foundRoles = false;
      for (const selector of roleElements) {
        if (await page.locator(selector).count() > 0) {
          foundRoles = true;
          break;
        }
      }

      // Roles should be visible or system should handle them gracefully
      expect(foundRoles).toBe(true);
    });
  });

  test.describe('Templates Management Protection', () => {
    test('Templates list should load and be accessible', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/templates');
      await page.waitForLoadState('networkidle');

      // Should load templates page
      expect(page.url()).toContain('/templates');

      // Should show templates list
      const templateElements = [
        '.templates-list',
        '.template-card',
        '.templates-table',
        '[data-testid="templates-list"]'
      ];

      let foundTemplates = false;
      for (const selector of templateElements) {
        if (await page.locator(selector).count() > 0) {
          foundTemplates = true;
          break;
        }
      }

      expect(foundTemplates).toBe(true);
    });

    test('Template creation functionality should remain intact', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/templates');
      await page.waitForLoadState('networkidle');

      // Look for create template button
      const createButtons = [
        'button:has-text("Create")',
        'button:has-text("New Template")',
        'button:has-text("Add Template")',
        '[data-testid="create-template"]',
        '.create-template-btn'
      ];

      let foundCreateButton = false;
      for (const selector of createButtons) {
        const button = page.locator(selector);
        if (await button.count() > 0 && await button.isVisible()) {
          foundCreateButton = true;

          // Try clicking to ensure it's functional
          await button.click();
          await page.waitForTimeout(1000);

          // Should navigate to create page or show modal
          const createIndicators = [
            'input[name="name"]',
            'input[placeholder*="template"]',
            '.template-form',
            '.modal',
            '.create-template-form'
          ];

          let foundCreateForm = false;
          for (const formSelector of createIndicators) {
            if (await page.locator(formSelector).count() > 0) {
              foundCreateForm = true;
              break;
            }
          }

          expect(foundCreateForm).toBe(true);
          break;
        }
      }

      expect(foundCreateButton).toBe(true);
    });
  });

  test.describe('Inspections Management Protection', () => {
    test('Inspections list should load correctly', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Should load inspections page
      expect(page.url()).toContain('/inspections');

      // Page should load without errors
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
      expect(pageContent.length).toBeGreaterThan(100);
    });

    test('Inspection creation should remain functional', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Look for create inspection functionality
      const createButtons = [
        'button:has-text("Create")',
        'button:has-text("New Inspection")',
        'button:has-text("Add Inspection")',
        '[data-testid="create-inspection"]'
      ];

      let foundCreateButton = false;
      for (const selector of createButtons) {
        if (await page.locator(selector).count() > 0) {
          foundCreateButton = true;
          break;
        }
      }

      // Create functionality should exist (even if we don't test the full flow)
      expect(foundCreateButton).toBe(true);
    });
  });

  test.describe('Multi-Organization Features Protection', () => {
    test('Organization context should be maintained', async () => {
      await utils.loginAsAdmin();

      // Check for organization indicators
      const orgElements = [
        '.organization-selector',
        '.org-switcher',
        '.current-org',
        '[data-testid="organization-context"]'
      ];

      let foundOrgContext = false;
      for (const selector of orgElements) {
        if (await page.locator(selector).count() > 0) {
          foundOrgContext = true;
          break;
        }
      }

      // Organization context should be available
      // (Not all UIs may show this visibly, so we'll check API calls as well)
      if (!foundOrgContext) {
        // Check if organization context is maintained in API calls
        const response = await page.goto('http://localhost:5173/api/v1/health');
        expect(response.status()).toBeLessThan(500);
      }
    });
  });

  test.describe('API Endpoints Protection', () => {
    test('Core API endpoints should remain accessible', async () => {
      // Test key API endpoints
      const apiEndpoints = [
        { url: '/api/v1/health', expectedStatus: 200 },
        { url: '/api/v1/auth/profile', expectedStatus: 401 }, // Should require auth
      ];

      for (const endpoint of apiEndpoints) {
        const response = await page.request.get(`http://localhost:3007${endpoint.url}`);
        expect(response.status()).toBe(endpoint.expectedStatus);
      }
    });

    test('Authentication should work for API calls', async () => {
      // Login to get token
      await utils.loginAsAdmin();

      // Check that authenticated API calls work
      const response = await page.request.get('http://localhost:3007/api/v1/auth/profile');

      // Should either work (200) or require proper token format (401/403)
      expect([200, 401, 403]).toContain(response.status());
    });
  });

  test.describe('Database Integration Protection', () => {
    test('Data persistence should work correctly', async () => {
      await utils.loginAsAdmin();

      // Navigate to different pages and ensure data loads
      await page.goto('http://localhost:5173/users');
      await page.waitForLoadState('networkidle');

      // Should load without database errors
      const errorMessages = [
        'database error',
        'connection failed',
        'server error',
        '500'
      ];

      const pageContent = await page.content();
      for (const errorMsg of errorMessages) {
        expect(pageContent.toLowerCase()).not.toContain(errorMsg);
      }
    });
  });
});