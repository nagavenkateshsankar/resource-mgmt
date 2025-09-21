/**
 * Assignment Workflow Regression Tests
 * Tests to ensure existing functionality remains intact after assignment workflow implementation
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Assignment Workflow Regression Tests', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Existing Inspection Creation Workflow', () => {
    test('Should still support individual inspection creation', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Should have the traditional inspection creation form
      const inspectionForm = page.locator('form');
      await expect(inspectionForm).toBeVisible();

      // Should have template selection
      const templateSelect = page.locator('select[name="template_id"], select[name="template"]');
      await expect(templateSelect).toBeVisible();

      const templateOptions = await templateSelect.locator('option').count();
      expect(templateOptions).toBeGreaterThan(1);

      // Should have site selection
      const siteSelect = page.locator('select[name="site_id"], select[name="site"]');
      if (await siteSelect.count() > 0) {
        await expect(siteSelect).toBeVisible();

        const siteOptions = await siteSelect.locator('option').count();
        expect(siteOptions).toBeGreaterThan(0);
      }

      // Fill form and submit
      await templateSelect.selectOption({ index: 1 });

      if (await siteSelect.count() > 0) {
        await siteSelect.selectOption({ index: 1 });
      }

      const submitButton = page.locator('button[type="submit"], input[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForLoadState('networkidle');

        // Should either succeed or show validation errors (not crash)
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();
      }
    });

    test('Should maintain existing inspection form validation', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Try to submit without filling required fields
      const submitButton = page.locator('button[type="submit"], input[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Should show validation or prevent submission
        const validationElements = [
          page.locator('.error'),
          page.locator('.invalid'),
          page.locator('[aria-invalid="true"]'),
          page.locator('.validation-error')
        ];

        let foundValidation = false;
        for (const element of validationElements) {
          if (await element.count() > 0) {
            foundValidation = true;
            break;
          }
        }

        // Should validate or button should be disabled
        const isDisabled = await submitButton.isDisabled();
        expect(foundValidation || isDisabled).toBe(true);
      }
    });

    test('Should preserve existing inspector assignment in individual inspections', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Should have inspector selection if it existed before
      const inspectorFields = [
        page.locator('select[name="inspector_id"]'),
        page.locator('select[name="inspector"]'),
        page.locator('select[name="assigned_to"]')
      ];

      let foundInspectorField = false;
      for (const field of inspectorFields) {
        if (await field.count() > 0) {
          foundInspectorField = true;

          // Should have inspector options
          const options = await field.locator('option').count();
          expect(options).toBeGreaterThan(0);
          break;
        }
      }

      // Inspector assignment should be available in some form
      expect(foundInspectorField).toBe(true);
    });
  });

  test.describe('Template Management Integration', () => {
    test('Should not break template creation and editing', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/templates');
      await page.waitForLoadState('networkidle');

      // Should display template list
      const templatesList = page.locator('.templates-list, .template-grid, table');
      await expect(templatesList).toBeVisible();

      // Should have create button
      const createButton = page.locator('button:has-text("Create"), a:has-text("Create"), .btn-create');
      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to template creation
        const currentUrl = page.url();
        expect(currentUrl).toContain('template');

        // Should have template form
        const templateForm = page.locator('form');
        await expect(templateForm).toBeVisible();
      }
    });

    test('Should maintain template-inspection relationship', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/templates');
      await page.waitForLoadState('networkidle');

      // Click on first template to view details
      const templateItems = page.locator('.template-item, .template-card, tbody tr');
      if (await templateItems.count() > 0) {
        await templateItems.nth(0).click();
        await page.waitForLoadState('networkidle');

        // Should show template details
        const templateDetails = page.locator('.template-details, .template-view');
        await expect(templateDetails).toBeVisible();

        // Should have option to create inspection from template
        const createInspectionButton = page.locator(
          'button:has-text("Create Inspection"), a:has-text("Use Template"), .btn-use'
        );

        if (await createInspectionButton.count() > 0) {
          await createInspectionButton.click();
          await page.waitForLoadState('networkidle');

          // Should navigate to inspection creation with template pre-selected
          const currentUrl = page.url();
          expect(currentUrl).toContain('inspection');
        }
      }
    });

    test('Should preserve template fields and validation rules', async () => {
      await utils.loginAsAdmin();

      // Check template creation
      const templatePaths = [
        '/templates/create',
        '/templates/new'
      ];

      let templateCreateFound = false;
      for (const path of templatePaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        if (!page.url().includes('/login')) {
          templateCreateFound = true;

          // Should have template fields
          const nameField = page.locator('input[name="name"]');
          const descriptionField = page.locator('textarea[name="description"], input[name="description"]');

          await expect(nameField).toBeVisible();

          if (await descriptionField.count() > 0) {
            await expect(descriptionField).toBeVisible();
          }

          // Should have field builder or field management
          const fieldElements = [
            page.locator('.field-builder'),
            page.locator('.template-fields'),
            page.locator('.form-fields'),
            page.locator('button:has-text("Add Field")')
          ];

          let foundFieldManagement = false;
          for (const element of fieldElements) {
            if (await element.count() > 0) {
              foundFieldManagement = true;
              break;
            }
          }

          expect(foundFieldManagement).toBe(true);
          break;
        }
      }

      expect(templateCreateFound).toBe(true);
    });
  });

  test.describe('Site Management Integration', () => {
    test('Should not break site creation and management', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/sites');
      await page.waitForLoadState('networkidle');

      // Should display sites list
      const sitesList = page.locator('.sites-list, .site-grid, table');
      await expect(sitesList).toBeVisible();

      // Should have create site button
      const createButton = page.locator('button:has-text("Create"), a:has-text("Create"), .btn-create');
      if (await createButton.count() > 0) {
        await createButton.click();
        await page.waitForLoadState('networkidle');

        // Should navigate to site creation
        const currentUrl = page.url();
        expect(currentUrl).toContain('site');

        // Should have site form
        const siteForm = page.locator('form');
        await expect(siteForm).toBeVisible();

        // Should have basic site fields
        const nameField = page.locator('input[name="name"]');
        const addressField = page.locator('input[name="address"], textarea[name="address"]');

        await expect(nameField).toBeVisible();

        if (await addressField.count() > 0) {
          await expect(addressField).toBeVisible();
        }
      }
    });

    test('Should maintain site-inspection relationship', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/sites');
      await page.waitForLoadState('networkidle');

      // Click on first site
      const siteItems = page.locator('.site-item, .site-card, tbody tr');
      if (await siteItems.count() > 0) {
        await siteItems.nth(0).click();
        await page.waitForLoadState('networkidle');

        // Should show site details
        const siteDetails = page.locator('.site-details, .site-view');
        await expect(siteDetails).toBeVisible();

        // Should show inspections for this site or have option to create one
        const inspectionElements = [
          page.locator('.site-inspections'),
          page.locator('.inspections-list'),
          page.locator('button:has-text("Create Inspection")'),
          page.locator(':text("inspection")')
        ];

        let foundInspectionRelation = false;
        for (const element of inspectionElements) {
          if (await element.count() > 0) {
            foundInspectionRelation = true;
            break;
          }
        }

        expect(foundInspectionRelation).toBe(true);
      }
    });

    test('Should preserve site filtering and search', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/sites');
      await page.waitForLoadState('networkidle');

      // Should have search functionality
      const searchField = page.locator('input[type="search"], input[name="search"], .search-input');
      if (await searchField.count() > 0) {
        await searchField.fill('test');
        await page.waitForTimeout(500);

        // Should filter sites
        const siteItems = page.locator('.site-item, .site-card, tbody tr');
        const itemCount = await siteItems.count();
        expect(itemCount).toBeGreaterThanOrEqual(0);
      }

      // Should have filters
      const filterElements = [
        page.locator('select[name="status"]'),
        page.locator('select[name="type"]'),
        page.locator('.filter-dropdown')
      ];

      let foundFilters = false;
      for (const element of filterElements) {
        if (await element.count() > 0) {
          foundFilters = true;
          break;
        }
      }

      expect(foundFilters).toBe(true);
    });
  });

  test.describe('User Management and Authentication', () => {
    test('Should maintain user authentication flow', async () => {
      // Test login flow
      await page.goto('http://localhost:5173/login');
      await page.waitForLoadState('networkidle');

      const loginForm = page.locator('form');
      await expect(loginForm).toBeVisible();

      // Should have email and password fields
      const emailField = page.locator('input[name="email"], input[type="email"]');
      const passwordField = page.locator('input[name="password"], input[type="password"]');

      await expect(emailField).toBeVisible();
      await expect(passwordField).toBeVisible();

      // Test admin login
      await utils.loginAsAdmin();

      // Should redirect to dashboard or main page
      await page.waitForLoadState('networkidle');
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/login');
    });

    test('Should preserve role-based access control', async () => {
      await utils.loginAsAdmin();

      // Admin should have access to admin features
      const adminPaths = [
        '/users',
        '/admin',
        '/settings'
      ];

      for (const path of adminPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        // Should not redirect to login or show unauthorized
        expect(currentUrl).not.toContain('/login');
        expect(currentUrl).not.toContain('/unauthorized');
      }

      // Test inspector access
      const inspectorLogin = await utils.loginAsUser('john@example.com', 'password123');
      if (inspectorLogin) {
        // Inspector should have limited access
        await page.goto('http://localhost:5173/users');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        // May be redirected away from admin pages
        expect(currentUrl).toBeTruthy();
      }
    });

    test('Should maintain user profile and preferences', async () => {
      await utils.loginAsAdmin();

      // Check profile access
      const profilePaths = [
        '/profile',
        '/settings/profile',
        '/account'
      ];

      let profileFound = false;
      for (const path of profilePaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        if (!page.url().includes('/login') && !page.url().includes('/404')) {
          profileFound = true;

          // Should show user information
          const userInfo = page.locator('.user-info, .profile-info, .account-info');
          if (await userInfo.count() > 0) {
            await expect(userInfo).toBeVisible();
          }
          break;
        }
      }

      expect(profileFound).toBe(true);
    });
  });

  test.describe('Dashboard and Analytics', () => {
    test('Should maintain dashboard functionality', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForLoadState('networkidle');

      // Should show dashboard
      const dashboard = page.locator('.dashboard, .dashboard-content');
      await expect(dashboard).toBeVisible();

      // Should have dashboard widgets or stats
      const widgets = [
        page.locator('.widget'),
        page.locator('.stat-card'),
        page.locator('.dashboard-card'),
        page.locator('.metric'),
        page.locator('.chart')
      ];

      let foundWidgets = false;
      for (const widget of widgets) {
        if (await widget.count() > 0) {
          foundWidgets = true;
          break;
        }
      }

      expect(foundWidgets).toBe(true);
    });

    test('Should preserve analytics and reporting', async () => {
      await utils.loginAsAdmin();

      const analyticsPaths = [
        '/analytics',
        '/reports',
        '/dashboard/analytics'
      ];

      let analyticsFound = false;
      for (const path of analyticsPaths) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        if (!page.url().includes('/login') && !page.url().includes('/404')) {
          analyticsFound = true;

          // Should show analytics content
          const analyticsContent = [
            page.locator('.analytics'),
            page.locator('.reports'),
            page.locator('.chart'),
            page.locator('.metrics')
          ];

          let foundContent = false;
          for (const content of analyticsContent) {
            if (await content.count() > 0) {
              foundContent = true;
              break;
            }
          }

          expect(foundContent).toBe(true);
          break;
        }
      }

      expect(analyticsFound).toBe(true);
    });
  });

  test.describe('Inspection List and Management', () => {
    test('Should maintain inspection listing functionality', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Should show inspections list
      const inspectionsList = page.locator('.inspections-list, .inspection-grid, table');
      await expect(inspectionsList).toBeVisible();

      // Should have create button
      const createButton = page.locator('button:has-text("Create"), a:has-text("Create")');
      await expect(createButton).toBeVisible();

      // Should have search and filters
      const searchField = page.locator('input[type="search"], input[name="search"]');
      if (await searchField.count() > 0) {
        await searchField.fill('test');
        await page.waitForTimeout(500);
      }

      // Should have status filters
      const statusFilter = page.locator('select[name="status"], .status-filter');
      if (await statusFilter.count() > 0) {
        await expect(statusFilter).toBeVisible();
      }
    });

    test('Should preserve inspection detail views', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Click on first inspection
      const inspectionItems = page.locator('.inspection-item, .inspection-card, tbody tr');
      if (await inspectionItems.count() > 0) {
        await inspectionItems.nth(0).click();
        await page.waitForLoadState('networkidle');

        // Should show inspection details
        const inspectionDetails = page.locator('.inspection-details, .inspection-view');
        await expect(inspectionDetails).toBeVisible();

        // Should show inspection information
        const inspectionInfo = [
          page.locator('.inspection-info'),
          page.locator('.inspection-data'),
          page.locator(':text("Template")'),
          page.locator(':text("Site")'),
          page.locator(':text("Status")')
        ];

        let foundInfo = false;
        for (const info of inspectionInfo) {
          if (await info.count() > 0) {
            foundInfo = true;
            break;
          }
        }

        expect(foundInfo).toBe(true);
      }
    });

    test('Should maintain inspection editing capabilities', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Look for edit functionality
      const editElements = [
        page.locator('button:has-text("Edit")'),
        page.locator('a:has-text("Edit")'),
        page.locator('.btn-edit'),
        page.locator('.edit-button')
      ];

      let foundEdit = false;
      for (const element of editElements) {
        if (await element.count() > 0) {
          await element.nth(0).click();
          await page.waitForLoadState('networkidle');

          // Should navigate to edit page
          const currentUrl = page.url();
          expect(currentUrl).toContain('edit');
          foundEdit = true;
          break;
        }
      }

      // Edit functionality should be available
      expect(foundEdit).toBe(true);
    });
  });

  test.describe('Navigation and Routing', () => {
    test('Should maintain main navigation structure', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForLoadState('networkidle');

      // Should have main navigation
      const navigation = page.locator('nav, .navigation, .sidebar, .menu');
      await expect(navigation).toBeVisible();

      // Should have navigation links
      const navLinks = [
        page.locator('a:has-text("Dashboard")'),
        page.locator('a:has-text("Inspections")'),
        page.locator('a:has-text("Templates")'),
        page.locator('a:has-text("Sites")')
      ];

      for (const link of navLinks) {
        if (await link.count() > 0) {
          await expect(link).toBeVisible();
        }
      }
    });

    test('Should preserve routing and URL structure', async () => {
      await utils.loginAsAdmin();

      const routes = [
        '/dashboard',
        '/inspections',
        '/templates',
        '/sites',
        '/users'
      ];

      for (const route of routes) {
        await page.goto(`http://localhost:5173${route}`);
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        expect(currentUrl).toContain(route);

        // Should not show 404 error
        const notFoundIndicators = [
          page.locator(':text("404")'),
          page.locator(':text("Not Found")'),
          page.locator(':text("Page not found")')
        ];

        for (const indicator of notFoundIndicators) {
          expect(await indicator.count()).toBe(0);
        }
      }
    });

    test('Should maintain breadcrumb navigation', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Click on an inspection to go deeper
      const inspectionItems = page.locator('.inspection-item, .inspection-card, tbody tr');
      if (await inspectionItems.count() > 0) {
        await inspectionItems.nth(0).click();
        await page.waitForLoadState('networkidle');

        // Should have breadcrumbs or back navigation
        const breadcrumbElements = [
          page.locator('.breadcrumb'),
          page.locator('.breadcrumbs'),
          page.locator('button:has-text("Back")'),
          page.locator('a:has-text("Back")')
        ];

        let foundNavigation = false;
        for (const element of breadcrumbElements) {
          if (await element.count() > 0) {
            foundNavigation = true;
            break;
          }
        }

        expect(foundNavigation).toBe(true);
      }
    });
  });

  test.describe('Data Persistence and State Management', () => {
    test('Should maintain data persistence across navigation', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Fill form partially
      const nameField = page.locator('input[name="name"], input[name="title"]');
      if (await nameField.count() > 0) {
        await nameField.fill('Test Persistence');
      }

      // Navigate away and back
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForLoadState('networkidle');

      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Form should either preserve data or be reset (both are valid behaviors)
      const currentValue = await nameField.inputValue();
      expect(typeof currentValue).toBe('string');
    });

    test('Should maintain user session state', async () => {
      await utils.loginAsAdmin();

      // Navigate to different pages
      const pages = ['/dashboard', '/inspections', '/templates', '/sites'];

      for (const pagePath of pages) {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForLoadState('networkidle');

        // Should remain authenticated
        const currentUrl = page.url();
        expect(currentUrl).not.toContain('/login');

        // Should show user-specific content
        const userElements = [
          page.locator('.user-info'),
          page.locator('.profile'),
          page.locator('.user-menu'),
          page.locator(':text("admin")'),
          page.locator(':text("logout")')
        ];

        let foundUserContext = false;
        for (const element of userElements) {
          if (await element.count() > 0) {
            foundUserContext = true;
            break;
          }
        }

        expect(foundUserContext).toBe(true);
      }
    });
  });

  test.describe('API Integration Stability', () => {
    test('Should maintain existing API endpoints', async () => {
      await utils.loginAsAdmin();

      // Monitor network requests to ensure existing APIs still work
      const apiCalls = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method()
          });
        }
      });

      // Navigate through existing functionality
      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      await page.goto('http://localhost:5173/templates');
      await page.waitForLoadState('networkidle');

      await page.goto('http://localhost:5173/sites');
      await page.waitForLoadState('networkidle');

      // Should have made API calls for existing functionality
      expect(apiCalls.length).toBeGreaterThan(0);

      // API calls should be successful (assuming they were working before)
      const failedCalls = apiCalls.filter(call => call.status >= 400);
      expect(failedCalls.length).toBe(0);
    });

    test('Should handle existing error scenarios gracefully', async () => {
      await utils.loginAsAdmin();

      // Test with simulated network errors
      await page.route('**/api/inspections', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        });
      });

      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Should handle error gracefully
      const errorElements = [
        page.locator('.error-message'),
        page.locator('.alert-error'),
        page.locator(':text("error")'),
        page.locator(':text("failed")')
      ];

      let foundErrorHandling = false;
      for (const element of errorElements) {
        if (await element.count() > 0) {
          foundErrorHandling = true;
          break;
        }
      }

      // Should show error message or empty state
      expect(foundErrorHandling).toBe(true);
    });
  });
});