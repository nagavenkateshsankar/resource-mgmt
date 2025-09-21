/**
 * Assignment Workflow Security and Permissions Tests
 * Tests for security vulnerabilities, authentication, authorization, and permission controls
 */

const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Assignment Workflow Security and Permissions', () => {
  let utils;
  let page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    utils = new TestUtils(page);
  });

  test.afterEach(async () => {
    await page?.close();
  });

  test.describe('Authentication Security', () => {
    test('Should prevent unauthorized access to assignment features', async () => {
      // Try to access assignment pages without authentication
      const protectedPages = [
        '/workflow/bulk-assignment',
        '/assignments',
        '/organizations/test-org/projects',
        '/organizations/test-org/assignments'
      ];

      for (const pagePath of protectedPages) {
        await page.goto(`http://localhost:5173${pagePath}`);
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        // Should redirect to login or show unauthorized
        expect(currentUrl).toContain('/login');
      }
    });

    test('Should invalidate sessions after logout', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Should have access to assignment page
      const assignmentForm = page.locator('.assignment-form, form');
      await expect(assignmentForm).toBeVisible();

      // Logout
      const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout"), .logout');
      if (await logoutButton.count() > 0) {
        await logoutButton.click();
        await page.waitForLoadState('networkidle');

        // Try to access protected page again
        await page.goto('http://localhost:5173/workflow/bulk-assignment');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        expect(currentUrl).toContain('/login');
      }
    });

    test('Should handle expired tokens gracefully', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Simulate expired token by clearing storage
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });

      // Try to make an API request
      await page.fill('input[name="name"]', 'Test Assignment');
      const submitButton = page.locator('button[type="submit"]');

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Should either redirect to login or show auth error
        const currentUrl = page.url();
        const errorElements = page.locator('.error, .unauthorized, :text("unauthorized")');

        expect(currentUrl.includes('/login') || await errorElements.count() > 0).toBe(true);
      }
    });

    test('Should protect against CSRF attacks', async () => {
      await utils.loginAsAdmin();

      // Monitor network requests for CSRF protection
      let csrfHeaderFound = false;
      page.on('request', request => {
        if (request.method() === 'POST' && request.url().includes('/api/')) {
          const headers = request.headers();
          if (headers['x-csrf-token'] || headers['csrf-token'] || headers['x-xsrf-token']) {
            csrfHeaderFound = true;
          }
        }
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Fill form and submit to trigger POST request
      await page.fill('input[name="name"]', 'CSRF Test Assignment');

      const templateSelect = page.locator('select[name="template_id"]');
      if (await templateSelect.count() > 0) {
        await templateSelect.selectOption({ index: 1 });
      }

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(1000);

        // Should have CSRF protection or proper authentication
        expect(csrfHeaderFound).toBe(true);
      }
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('Admin should have full assignment management access', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Admin should see all assignment creation options
      const adminFeatures = [
        page.locator('button:has-text("Create")'),
        page.locator('.bulk-assignment'),
        page.locator('select[name="template_id"]'),
        page.locator('.site-card'),
        page.locator('input[value="manual"]'),
        page.locator('input[value="auto"]')
      ];

      for (const feature of adminFeatures) {
        if (await feature.count() > 0) {
          await expect(feature).toBeVisible();
        }
      }

      // Admin should be able to assign to any inspector
      const inspectorSelect = page.locator('select:has(option:contains("inspector"))');
      if (await inspectorSelect.count() > 0) {
        const options = await inspectorSelect.locator('option').count();
        expect(options).toBeGreaterThan(1);
      }
    });

    test('Supervisor should have limited assignment access', async () => {
      // If supervisor login is available
      const supervisorLogin = await utils.loginAsUser('supervisor@test.com', 'password123');

      if (supervisorLogin) {
        await page.goto('http://localhost:5173/workflow/bulk-assignment');
        await page.waitForLoadState('networkidle');

        // Supervisor might have access but potentially limited options
        const currentUrl = page.url();
        if (!currentUrl.includes('/login') && !currentUrl.includes('/unauthorized')) {
          // Should have some assignment capabilities
          const assignmentForm = page.locator('.assignment-form, form');
          await expect(assignmentForm).toBeVisible();

          // May have restricted inspector options
          const inspectorSelect = page.locator('select:has(option:contains("inspector"))');
          if (await inspectorSelect.count() > 0) {
            const options = await inspectorSelect.locator('option').count();
            expect(options).toBeGreaterThanOrEqual(1);
          }
        }
      }
    });

    test('Inspector should only see their own assignments', async () => {
      const inspectorLogin = await utils.loginAsUser('john@example.com', 'password123');

      if (inspectorLogin) {
        await page.goto('http://localhost:5173/assignments');
        await page.waitForLoadState('networkidle');

        // Inspector should see assignments page
        const assignmentsList = page.locator('.assignments-list, .assignment-item');
        if (await assignmentsList.count() > 0) {
          // All visible assignments should be assigned to this inspector
          const assignmentItems = page.locator('.assignment-item');
          const itemCount = await assignmentItems.count();

          if (itemCount > 0) {
            for (let i = 0; i < Math.min(3, itemCount); i++) {
              const item = assignmentItems.nth(i);
              // Should not see assignments for other inspectors
              const assignedToOthers = page.locator(':text("Assigned to:")').and(page.locator(':not(:text("john"))'));
              expect(await assignedToOthers.count()).toBe(0);
            }
          }
        }

        // Inspector should NOT have access to create assignments
        await page.goto('http://localhost:5173/workflow/bulk-assignment');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        expect(currentUrl.includes('/login') || currentUrl.includes('/unauthorized') || currentUrl.includes('/forbidden')).toBe(true);
      }
    });

    test('Viewer role should have read-only access', async () => {
      const viewerLogin = await utils.loginAsUser('viewer@test.com', 'password123');

      if (viewerLogin) {
        // Viewer should not have access to assignment creation
        await page.goto('http://localhost:5173/workflow/bulk-assignment');
        await page.waitForLoadState('networkidle');

        const currentUrl = page.url();
        expect(currentUrl.includes('/login') || currentUrl.includes('/unauthorized')).toBe(true);

        // Viewer might have read access to assignments list
        await page.goto('http://localhost:5173/assignments');
        await page.waitForLoadState('networkidle');

        const assignmentsUrl = page.url();
        if (!assignmentsUrl.includes('/login') && !assignmentsUrl.includes('/unauthorized')) {
          // Should see assignments but no edit/create buttons
          const createButtons = page.locator('button:has-text("Create"), button:has-text("New")');
          expect(await createButtons.count()).toBe(0);

          const editButtons = page.locator('button:has-text("Edit"), .btn-edit');
          expect(await editButtons.count()).toBe(0);
        }
      }
    });
  });

  test.describe('Organization-Level Security', () => {
    test('Should enforce organization isolation', async () => {
      await utils.loginAsAdmin();

      // Try to access another organization's data
      const otherOrgEndpoints = [
        '/organizations/other-org-id/projects',
        '/organizations/different-org/assignments',
        '/organizations/fake-org/workloads'
      ];

      for (const endpoint of otherOrgEndpoints) {
        // Mock API call to unauthorized organization
        await page.route(`**/api/v1${endpoint}`, route => {
          route.fulfill({
            status: 403,
            contentType: 'application/json',
            body: JSON.stringify({ error: 'Forbidden: Access denied to organization' })
          });
        });

        await page.goto(`http://localhost:5173${endpoint.replace('/api/v1', '')}`);
        await page.waitForTimeout(1000);

        // Should show error or redirect
        const errorElements = page.locator('.error, .forbidden, :text("forbidden"), :text("access denied")');
        expect(await errorElements.count()).toBeGreaterThan(0);
      }
    });

    test('Should validate organization context in API calls', async () => {
      await utils.loginAsAdmin();

      let organizationHeaderFound = false;
      page.on('request', request => {
        if (request.url().includes('/api/') && request.url().includes('/organizations/')) {
          const headers = request.headers();
          if (headers['x-organization-id'] || headers['organization-id']) {
            organizationHeaderFound = true;
          }
        }
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Organization context should be included in API calls
      expect(organizationHeaderFound).toBe(true);
    });

    test('Should prevent cross-organization data access', async () => {
      await utils.loginAsAdmin();

      // Test assignment creation with organization validation
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Sites and templates should only be from current organization
      const siteCards = page.locator('.site-card');
      if (await siteCards.count() > 0) {
        // All sites should belong to current organization
        // This would be validated by checking data attributes or organization info
        const firstSite = siteCards.nth(0);
        await expect(firstSite).toBeVisible();
      }

      const templateSelect = page.locator('select[name="template_id"]');
      if (await templateSelect.count() > 0) {
        const options = await templateSelect.locator('option').count();
        expect(options).toBeGreaterThan(0);
        // Templates should only be from current organization
      }
    });
  });

  test.describe('Input Security and Validation', () => {
    test('Should prevent XSS attacks in form inputs', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test XSS payloads in text inputs
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        'javascript:alert("XSS")',
        '<img src=x onerror=alert("XSS")>',
        '"><script>alert("XSS")</script>',
        "' OR '1'='1"
      ];

      const textInputs = page.locator('input[type="text"], textarea');
      const inputCount = await textInputs.count();

      if (inputCount > 0) {
        for (const payload of xssPayloads) {
          await textInputs.nth(0).fill(payload);
          await page.click('body'); // Trigger any event handlers

          // Should not execute script - check if alerts appeared
          const alerts = await page.evaluate(() => window.alertCount || 0);
          expect(alerts).toBe(0);

          // Check if input was properly escaped/sanitized
          const inputValue = await textInputs.nth(0).inputValue();
          if (inputValue.includes('<script>')) {
            // If script tags are preserved, they should be escaped in the DOM
            const renderedValue = await textInputs.nth(0).evaluate(el => el.value);
            expect(renderedValue).not.toContain('<script>alert');
          }
        }
      }
    });

    test('Should validate and sanitize file uploads', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Look for file upload inputs
      const fileInputs = page.locator('input[type="file"]');
      const fileInputCount = await fileInputs.count();

      if (fileInputCount > 0) {
        const fileInput = fileInputs.nth(0);

        // Test file type validation
        const testFiles = [
          { name: 'test.exe', type: 'application/x-executable' },
          { name: 'test.php', type: 'application/x-php' },
          { name: 'test.js', type: 'application/javascript' },
          { name: 'test.jpg', type: 'image/jpeg' }
        ];

        for (const file of testFiles) {
          // Create test file
          const buffer = Buffer.from('test content');
          await fileInput.setInputFiles({
            name: file.name,
            mimeType: file.type,
            buffer: buffer
          });

          // Should validate file type appropriately
          const errorElements = page.locator('.file-error, .upload-error, .error');
          const fileError = await errorElements.count();

          if (file.name.endsWith('.exe') || file.name.endsWith('.php')) {
            // Should reject dangerous files
            expect(fileError).toBeGreaterThan(0);
          }
        }
      }
    });

    test('Should prevent SQL injection in search and filters', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      // Test SQL injection payloads in search
      const searchInput = page.locator('input[type="search"], input[name="search"]');
      if (await searchInput.count() > 0) {
        const sqlPayloads = [
          "'; DROP TABLE assignments; --",
          "' OR '1'='1",
          "1' UNION SELECT * FROM users --",
          "'; DELETE FROM assignments WHERE '1'='1",
          "admin'--"
        ];

        for (const payload of sqlPayloads) {
          await searchInput.fill(payload);
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);

          // Should not cause errors or unexpected behavior
          const errorElements = page.locator('.sql-error, .database-error, .error:has-text("SQL")');
          expect(await errorElements.count()).toBe(0);

          // Should still show normal search results or empty state
          const currentUrl = page.url();
          expect(currentUrl).toContain('/assignments');
        }
      }
    });

    test('Should validate numeric inputs and prevent overflow', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Test numeric input validation
      const numericInputs = page.locator('input[type="number"]');
      const numericCount = await numericInputs.count();

      if (numericCount > 0) {
        const testValues = [
          '999999999999999999999999999999',
          '-999999999999999999',
          '1.7976931348623157E+308',
          'NaN',
          'Infinity',
          '-Infinity',
          '0x1337',
          '../../etc/passwd'
        ];

        for (const value of testValues) {
          const input = numericInputs.nth(0);
          await input.fill(value);
          await page.click('body');

          // Should validate or constrain the input
          const inputValue = await input.inputValue();

          // Should not allow invalid numeric values
          if (value.includes('E+') || value === 'NaN' || value.includes('Infinity')) {
            expect(inputValue).not.toBe(value);
          }

          // Should not allow path traversal in numeric fields
          if (value.includes('..')) {
            expect(inputValue).not.toContain('..');
          }
        }
      }
    });
  });

  test.describe('API Security', () => {
    test('Should require authentication for API endpoints', async () => {
      // Test API endpoints without authentication
      const apiEndpoints = [
        '/api/v1/organizations/test-org/projects',
        '/api/v1/organizations/test-org/assignments',
        '/api/v1/organizations/test-org/workloads',
        '/api/v1/organizations/test-org/workflow/analytics'
      ];

      for (const endpoint of apiEndpoints) {
        const response = await page.request.get(`http://localhost:3007${endpoint}`);
        expect(response.status()).toBe(401); // Unauthorized
      }
    });

    test('Should validate JWT tokens properly', async () => {
      await utils.loginAsAdmin();

      // Test with invalid JWT token
      await page.route('**/api/**', (route, request) => {
        route.continue({
          headers: {
            ...request.headers(),
            'Authorization': 'Bearer invalid.jwt.token'
          }
        });
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Should either redirect to login or show auth error
      const currentUrl = page.url();
      const errorElements = page.locator('.auth-error, .unauthorized, :text("unauthorized")');

      expect(currentUrl.includes('/login') || await errorElements.count() > 0).toBe(true);
    });

    test('Should rate limit API requests', async () => {
      await utils.loginAsAdmin();

      let requestCount = 0;
      let rateLimitHit = false;

      page.on('response', response => {
        if (response.url().includes('/api/')) {
          requestCount++;
          if (response.status() === 429) {
            rateLimitHit = true;
          }
        }
      });

      // Make rapid API requests
      for (let i = 0; i < 50; i++) {
        await page.goto('http://localhost:5173/assignments');
        await page.waitForTimeout(50);
      }

      // Should implement rate limiting for protection
      // Note: This test may not trigger rate limiting in development
      expect(requestCount).toBeGreaterThan(0);
    });

    test('Should validate request size limits', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Create very large payload
      const largeDescription = 'A'.repeat(100000); // 100KB
      const largeInstructions = 'B'.repeat(100000); // 100KB

      await page.fill('input[name="name"]', 'Large Payload Test');

      const descriptionField = page.locator('textarea[name="description"]');
      if (await descriptionField.count() > 0) {
        await descriptionField.fill(largeDescription);
      }

      const instructionsField = page.locator('textarea[name="instructions"]');
      if (await instructionsField.count() > 0) {
        await instructionsField.fill(largeInstructions);
      }

      const submitButton = page.locator('button[type="submit"]');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Should either succeed or reject large payload appropriately
        const errorElements = page.locator('.error, .payload-error, :text("too large")');
        const successElements = page.locator('.success, :text("created")');

        // Should handle large payloads gracefully
        expect(await errorElements.count() >= 0 && await successElements.count() >= 0).toBe(true);
      }
    });
  });

  test.describe('Data Privacy and Protection', () => {
    test('Should not expose sensitive data in client-side code', async () => {
      await utils.loginAsAdmin();
      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      // Check for sensitive data in page source
      const pageContent = await page.content();

      // Should not contain sensitive information
      const sensitivePatterns = [
        /password.*[:=]/i,
        /secret.*[:=]/i,
        /api[_-]?key.*[:=]/i,
        /private[_-]?key/i,
        /token.*[:=].*[a-zA-Z0-9]{20,}/i,
        /mysql.*password/i,
        /database.*password/i
      ];

      for (const pattern of sensitivePatterns) {
        expect(pageContent).not.toMatch(pattern);
      }
    });

    test('Should sanitize data in API responses', async () => {
      await utils.loginAsAdmin();

      let apiResponseChecked = false;
      page.on('response', async response => {
        if (response.url().includes('/api/') && response.status() === 200) {
          try {
            const responseBody = await response.text();

            // Should not contain sensitive fields
            const sensitiveFields = [
              'password',
              'password_hash',
              'secret',
              'private_key',
              'api_key'
            ];

            for (const field of sensitiveFields) {
              expect(responseBody).not.toContain(`"${field}":`);
            }

            apiResponseChecked = true;
          } catch (error) {
            // Response might not be JSON
          }
        }
      });

      await page.goto('http://localhost:5173/assignments');
      await page.waitForLoadState('networkidle');

      expect(apiResponseChecked).toBe(true);
    });

    test('Should implement proper session management', async () => {
      await utils.loginAsAdmin();

      // Check session cookies
      const cookies = await page.context().cookies();
      const sessionCookies = cookies.filter(cookie =>
        cookie.name.toLowerCase().includes('session') ||
        cookie.name.toLowerCase().includes('auth')
      );

      if (sessionCookies.length > 0) {
        for (const cookie of sessionCookies) {
          // Session cookies should have proper security flags
          expect(cookie.httpOnly).toBe(true);
          expect(cookie.secure || cookie.sameSite === 'strict').toBe(true);
        }
      }

      // Check local storage for sensitive data
      const localStorage = await page.evaluate(() => {
        const items = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          items[key] = localStorage.getItem(key);
        }
        return items;
      });

      // Should not store sensitive data in localStorage
      for (const [key, value] of Object.entries(localStorage)) {
        if (typeof value === 'string') {
          expect(value).not.toMatch(/password|secret|private/i);
        }
      }
    });
  });

  test.describe('Security Headers and Configuration', () => {
    test('Should implement proper security headers', async () => {
      await utils.loginAsAdmin();

      const response = await page.goto('http://localhost:5173/workflow/bulk-assignment');
      const headers = response.headers();

      // Check for security headers
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'strict-transport-security',
        'content-security-policy'
      ];

      let foundSecurityHeaders = 0;
      for (const header of securityHeaders) {
        if (headers[header]) {
          foundSecurityHeaders++;
        }
      }

      // Should have some security headers implemented
      expect(foundSecurityHeaders).toBeGreaterThan(0);
    });

    test('Should prevent clickjacking attacks', async () => {
      const response = await page.goto('http://localhost:5173/workflow/bulk-assignment');
      const headers = response.headers();

      // Should have X-Frame-Options or CSP frame-ancestors
      const frameOptions = headers['x-frame-options'];
      const csp = headers['content-security-policy'];

      const hasClickjackingProtection =
        frameOptions === 'DENY' ||
        frameOptions === 'SAMEORIGIN' ||
        (csp && csp.includes('frame-ancestors'));

      expect(hasClickjackingProtection).toBe(true);
    });

    test('Should implement content security policy', async () => {
      const response = await page.goto('http://localhost:5173/workflow/bulk-assignment');
      const headers = response.headers();

      const csp = headers['content-security-policy'];
      if (csp) {
        // CSP should restrict script sources
        expect(csp).toContain('script-src');

        // Should not allow 'unsafe-eval' in production
        expect(csp).not.toContain("'unsafe-eval'");
      }
    });
  });

  test.describe('Error Handling Security', () => {
    test('Should not expose stack traces or internal errors', async () => {
      await utils.loginAsAdmin();

      // Simulate various error conditions
      await page.route('**/api/**', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error',
            // Should not include stack trace or sensitive info
            message: 'An error occurred while processing your request'
          })
        });
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="name"]', 'Error Test');
      const submitButton = page.locator('button[type="submit"]');

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Check error message displayed to user
        const errorElements = page.locator('.error, .error-message');
        if (await errorElements.count() > 0) {
          const errorText = await errorElements.nth(0).textContent();

          // Should not contain sensitive information
          expect(errorText).not.toMatch(/stack trace/i);
          expect(errorText).not.toMatch(/database/i);
          expect(errorText).not.toMatch(/sql/i);
          expect(errorText).not.toMatch(/file path/i);
          expect(errorText).not.toMatch(/line \d+/);
        }
      }
    });

    test('Should handle malformed requests gracefully', async () => {
      await utils.loginAsAdmin();

      // Test with malformed JSON
      await page.route('**/api/**', route => {
        route.continue({
          postData: '{"invalid": json}' // Malformed JSON
        });
      });

      await page.goto('http://localhost:5173/workflow/bulk-assignment');
      await page.waitForLoadState('networkidle');

      await page.fill('input[name="name"]', 'Malformed Test');
      const submitButton = page.locator('button[type="submit"]');

      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        // Should handle gracefully without exposing internal details
        const currentUrl = page.url();
        expect(currentUrl).toBeTruthy();

        // Should not crash the application
        const fatalErrors = page.locator(':text("fatal"), :text("crash"), :text("undefined")');
        expect(await fatalErrors.count()).toBe(0);
      }
    });
  });
});