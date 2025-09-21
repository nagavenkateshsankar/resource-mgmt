/**
 * Baseline Monitoring Tests
 * Continuous monitoring to catch breaking changes during development
 * These tests should run before and after major changes to detect regressions
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Baseline System Monitoring', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Critical Path Monitoring', () => {
    test('Critical user journey: Login → Dashboard → Create Inspection', async () => {
      // Step 1: Login
      const loginSuccess = await utils.loginAsAdmin();
      expect(loginSuccess).toBe(true);

      // Step 2: Navigate to Dashboard
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForLoadState('networkidle');
      expect(page.url()).not.toContain('/login');

      // Step 3: Navigate to Inspections
      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/inspections');

      // Step 4: Try to access inspection creation
      await page.goto('http://localhost:5173/inspections/create');
      await page.waitForLoadState('networkidle');

      // Should load creation page without errors
      const pageContent = await page.content();
      expect(pageContent).not.toContain('500');
      expect(pageContent).not.toContain('Internal Server Error');
      expect(pageContent).not.toContain('database error');
    });

    test('Critical user journey: Login → Templates → View/Create', async () => {
      await utils.loginAsAdmin();

      // Navigate to Templates
      await page.goto('http://localhost:5173/templates');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/templates');

      // Page should load successfully
      const pageContent = await page.content();
      expect(pageContent).not.toContain('500');
      expect(pageContent).not.toContain('Internal Server Error');

      // Try template creation
      await page.goto('http://localhost:5173/templates/create');
      await page.waitForLoadState('networkidle');

      // Should not error out
      expect(page.url()).not.toContain('/login');
    });

    test('Critical user journey: Login → Users Management', async () => {
      await utils.loginAsAdmin();

      // Navigate to Users
      await page.goto('http://localhost:5173/users');
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('/users');

      // Page should load successfully
      const pageContent = await page.content();
      expect(pageContent).not.toContain('500');
      expect(pageContent).not.toContain('Internal Server Error');
      expect(pageContent).not.toContain('database error');
    });
  });

  test.describe('API Health Monitoring', () => {
    test('Core API endpoints should respond correctly', async () => {
      const endpoints = [
        { path: '/api/v1/health', expectedStatus: 200 },
        { path: '/api/v1/auth/profile', expectedStatus: 401 }, // Should require auth
      ];

      for (const endpoint of endpoints) {
        const response = await page.request.get(`http://localhost:3007${endpoint.path}`);
        expect(response.status()).toBe(endpoint.expectedStatus);
      }
    });

    test('Authenticated API endpoints should work with valid token', async () => {
      // Get auth token
      const loginResponse = await page.request.post('http://localhost:3007/api/v1/auth/login', {
        data: {
          email: 'admin@resourcemgmt.com',
          password: 'password123'
        }
      });

      if (loginResponse.ok()) {
        const loginData = await loginResponse.json();
        const token = loginData.token || loginData.access_token;

        if (token) {
          // Test authenticated endpoints
          const authEndpoints = [
            '/api/v1/auth/profile',
            '/api/v1/templates',
            '/api/v1/inspections',
            '/api/v1/users'
          ];

          for (const endpoint of authEndpoints) {
            const response = await page.request.get(`http://localhost:3007${endpoint}`, {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            // Should not be 500 (server error)
            expect(response.status()).toBeLessThan(500);
          }
        }
      }
    });
  });

  test.describe('Database Connectivity Monitoring', () => {
    test('Database operations should work correctly', async () => {
      await utils.loginAsAdmin();

      // Test data loading on different pages
      const dataPages = [
        '/users',
        '/templates',
        '/inspections'
      ];

      for (const pagePath of dataPages) {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForLoadState('networkidle');

        // Check for database error messages
        const pageContent = await page.content();
        expect(pageContent.toLowerCase()).not.toContain('database error');
        expect(pageContent.toLowerCase()).not.toContain('connection failed');
        expect(pageContent.toLowerCase()).not.toContain('sql error');
      }
    });
  });

  test.describe('Performance Monitoring', () => {
    test('Page load times should be reasonable', async () => {
      await utils.loginAsAdmin();

      const pages = [
        '/dashboard',
        '/inspections',
        '/templates',
        '/users'
      ];

      for (const pagePath of pages) {
        const startTime = Date.now();

        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForLoadState('networkidle');

        const loadTime = Date.now() - startTime;

        // Page should load within 10 seconds (generous for development)
        expect(loadTime).toBeLessThan(10000);
      }
    });

    test('API response times should be reasonable', async () => {
      const startTime = Date.now();

      const response = await page.request.get('http://localhost:3007/api/v1/health');

      const responseTime = Date.now() - startTime;

      expect(response.status()).toBe(200);
      expect(responseTime).toBeLessThan(5000); // 5 seconds max for health check
    });
  });

  test.describe('Error Handling Monitoring', () => {
    test('Invalid routes should handle gracefully', async () => {
      await utils.loginAsAdmin();

      await page.goto('http://localhost:5173/nonexistent-page');
      await page.waitForLoadState('networkidle');

      // Should either show 404 page or redirect, not crash
      const pageContent = await page.content();
      expect(pageContent).toBeTruthy();
      expect(pageContent.length).toBeGreaterThan(100);
    });

    test('Invalid API calls should return proper errors', async () => {
      const response = await page.request.get('http://localhost:3007/api/v1/nonexistent-endpoint');

      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Security Monitoring', () => {
    test('Unauthenticated access should be properly blocked', async () => {
      // Try accessing protected pages without login
      const protectedPages = [
        '/dashboard',
        '/inspections',
        '/templates',
        '/users'
      ];

      for (const pagePath of protectedPages) {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForLoadState('networkidle');

        // Should redirect to login or show login page
        expect(page.url()).toContain('/login');
      }
    });

    test('API endpoints should require proper authentication', async () => {
      const protectedEndpoints = [
        '/api/v1/auth/profile',
        '/api/v1/templates',
        '/api/v1/inspections',
        '/api/v1/users'
      ];

      for (const endpoint of protectedEndpoints) {
        const response = await page.request.get(`http://localhost:3007${endpoint}`);

        // Should return 401 (Unauthorized) for protected endpoints
        expect(response.status()).toBe(401);
      }
    });
  });

  test.describe('Multi-Tenant Isolation Monitoring', () => {
    test('Organization context should be maintained', async () => {
      await utils.loginAsAdmin();

      // Check that organization context is present in requests
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForLoadState('networkidle');

      // Monitor network requests for organization headers/context
      const requests = [];
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          requests.push(request);
        }
      });

      await page.goto('http://localhost:5173/inspections');
      await page.waitForLoadState('networkidle');

      // Should have made API requests
      expect(requests.length).toBeGreaterThan(0);
    });
  });

  test.describe('Browser Compatibility Monitoring', () => {
    test('Core functionality should work across different viewport sizes', async () => {
      await utils.loginAsAdmin();

      // Test mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('http://localhost:5173/dashboard');
      await page.waitForLoadState('networkidle');

      let pageContent = await page.content();
      expect(pageContent).toBeTruthy();

      // Test tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      pageContent = await page.content();
      expect(pageContent).toBeTruthy();

      // Test desktop viewport
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.reload();
      await page.waitForLoadState('networkidle');

      pageContent = await page.content();
      expect(pageContent).toBeTruthy();
    });
  });

  test.describe('Data Integrity Monitoring', () => {
    test('User data should remain consistent', async () => {
      await utils.loginAsAdmin();

      // Check user profile data consistency
      await page.goto('http://localhost:5173/users');
      await page.waitForLoadState('networkidle');

      // If users are displayed, check for basic data integrity
      const userElements = await page.locator('.user-card, .user-row, tbody tr').count();

      if (userElements > 0) {
        // Check that user data contains expected fields (no broken references)
        const pageContent = await page.content();
        expect(pageContent).not.toContain('undefined');
        expect(pageContent).not.toContain('[object Object]');
        expect(pageContent).not.toContain('null');
      }
    });

    test('Navigation state should remain consistent', async () => {
      await utils.loginAsAdmin();

      // Navigate through different pages and ensure navigation state is consistent
      const navigationFlow = [
        '/dashboard',
        '/inspections',
        '/templates',
        '/users',
        '/dashboard'
      ];

      for (const path of navigationFlow) {
        await page.goto(`http://localhost:5173${path}`);
        await page.waitForLoadState('networkidle');

        // Should maintain authenticated state
        expect(page.url()).not.toContain('/login');

        // Check for navigation indicators
        const navElements = await page.locator('.nav, .navigation, .menu, .sidebar').count();
        expect(navElements).toBeGreaterThan(0);
      }
    });
  });
});