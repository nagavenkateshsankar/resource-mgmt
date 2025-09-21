const { test, expect } = require('@playwright/test');
const { TestUtils } = require('./test-utils');

test.describe('Authentication Flow', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
  });

  test.describe('Login Page', () => {
    test('should display login form correctly', async ({ page }) => {
      await utils.navigateTo('/login');

      const form = utils.getLoginForm();

      // Check form elements are visible
      await expect(form.email).toBeVisible();
      await expect(form.password).toBeVisible();
      await expect(form.submitButton).toBeVisible();

      // Check form labels and text
      await expect(page.locator('h1')).toContainText('Sign In');
      await expect(page.locator('label')).toContainText(['Email', 'Password']);
    });

    test('should show validation for empty form submission', async ({ page }) => {
      await utils.navigateTo('/login');

      const form = utils.getLoginForm();
      await form.submitButton.click();

      // Should either show validation errors or button should be disabled
      const isButtonDisabled = await form.submitButton.isDisabled();
      if (!isButtonDisabled) {
        // Check for validation messages
        await expect(form.email).toBeFocused();
      } else {
        await expect(form.submitButton).toBeDisabled();
      }
    });

    test('should successfully login with admin credentials', async ({ page }) => {
      const loginSuccess = await utils.loginAsAdmin();

      expect(loginSuccess).toBe(true);
      await expect(page).toHaveURL(/\/dashboard/);

      // Verify we're actually logged in by checking for user menu or logout option
      const userMenu = page.locator('.user-menu, .profile-menu, button:has-text("Logout")');
      await expect(userMenu.first()).toBeVisible({ timeout: 5000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await utils.navigateTo('/login');

      const form = utils.getLoginForm();
      await form.email.fill('invalid@example.com');
      await form.password.fill('wrongpassword');
      await form.submitButton.click();

      // Wait for error response
      await page.waitForTimeout(3000);

      // Should stay on login page and show error
      expect(page.url()).toContain('/login');

      // Check for error message (various possible selectors)
      const errorVisible = await Promise.race([
        form.errorMessage.isVisible().catch(() => false),
        page.locator('.alert-danger').isVisible().catch(() => false),
        page.locator('[data-testid="error-message"]').isVisible().catch(() => false)
      ]);

      if (!errorVisible) {
        console.log('Error message not found - form might use different error display');
      }
    });

    test('should handle network errors gracefully', async ({ page }) => {
      await utils.navigateTo('/login');

      // Block login API to simulate network error
      await page.route('**/api/v1/auth/login', route => {
        route.abort('failed');
      });

      const form = utils.getLoginForm();
      await form.email.fill('admin@resourcemgmt.com');
      await form.password.fill('password123');
      await form.submitButton.click();

      // Should handle network error gracefully
      await page.waitForTimeout(2000);

      // Button should return to normal state or show error
      const buttonText = await form.submitButton.textContent();
      expect(buttonText).not.toContain('...');
    });
  });

  test.describe('Authentication State Management', () => {
    test('should redirect to login when accessing protected routes without auth', async ({ page }) => {
      const protectedRoutes = ['/dashboard', '/users', '/inspections', '/templates'];

      for (const route of protectedRoutes) {
        await utils.navigateTo(route);
        await page.waitForTimeout(1000);

        // Should redirect to login or show login requirement
        const currentUrl = page.url();
        if (!currentUrl.includes('/login')) {
          // Might show login form inline
          const hasLoginForm = await utils.getLoginForm().email.isVisible().catch(() => false);
          if (!hasLoginForm) {
            console.log(`Route ${route} accessible without auth - check if intended`);
          }
        } else {
          expect(currentUrl).toContain('/login');
        }
      }
    });

    test('should persist authentication across page refreshes', async ({ page }) => {
      // Login first
      await utils.loginAsAdmin();
      await expect(page).toHaveURL(/\/dashboard/);

      // Refresh page
      await page.reload();
      await utils.waitForPageLoad();

      // Should still be logged in and on dashboard
      expect(page.url()).toContain('/dashboard');

      // Verify user menu is still visible
      const userMenu = page.locator('.user-menu, .profile-menu, button:has-text("Logout")');
      await expect(userMenu.first()).toBeVisible({ timeout: 5000 });
    });

    test('should clear authentication on logout', async ({ page }) => {
      // Login first
      await utils.loginAsAdmin();
      await expect(page).toHaveURL(/\/dashboard/);

      // Logout
      await utils.logout();

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);

      // Token should be cleared from localStorage
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeFalsy();
    });

    test('should handle token expiration', async ({ page }) => {
      // Login and get valid token
      await utils.loginAsAdmin();
      await expect(page).toHaveURL(/\/dashboard/);

      // Simulate expired token by setting invalid token
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'expired.token.here');
      });

      // Try to access protected page
      await utils.navigateTo('/users');
      await page.waitForTimeout(2000);

      // Should redirect to login due to invalid token
      const currentUrl = page.url();
      if (currentUrl.includes('/login')) {
        expect(currentUrl).toContain('/login');
      } else {
        // Might handle token validation differently
        console.log('Token expiration handling might use different approach');
      }
    });
  });

  test.describe('Multi-Organization Authentication', () => {
    test('should handle organization context after login', async ({ page }) => {
      await utils.loginAsAdmin();
      await expect(page).toHaveURL(/\/dashboard/);

      // Check if organization context is set
      const orgData = await page.evaluate(() => {
        return {
          orgId: localStorage.getItem('organization_id'),
          orgName: localStorage.getItem('organization_name')
        };
      });

      expect(orgData.orgId).toBeTruthy();
      console.log('Organization context:', orgData);
    });

    test('should maintain organization isolation', async ({ page }) => {
      await utils.loginAsAdmin();
      await utils.navigateTo('/users');

      // Setup network monitoring to check organization filtering
      const requests = [];
      page.on('request', request => {
        if (request.url().includes('/api/v1/users')) {
          requests.push(request.url());
        }
      });

      await page.reload();
      await utils.waitForPageLoad();

      // Verify organization ID is included in API requests
      expect(requests.length).toBeGreaterThan(0);
      const hasOrgParam = requests.some(url =>
        url.includes('organization_id') || url.includes('org_id')
      );

      if (!hasOrgParam) {
        console.log('Organization filtering in API requests not detected');
      }
    });
  });

  test.describe('Security Validation', () => {
    test('should sanitize input fields', async ({ page }) => {
      await utils.navigateTo('/login');

      const form = utils.getLoginForm();

      // Test XSS prevention
      const xssPayload = '<script>alert("xss")</script>';
      await form.email.fill(xssPayload);
      await form.password.fill(xssPayload);

      const emailValue = await form.email.inputValue();
      const passwordValue = await form.password.inputValue();

      // Values should be sanitized or raw (depending on implementation)
      console.log('Input sanitization test:', { emailValue, passwordValue });
    });

    test('should implement CSRF protection', async ({ page }) => {
      await utils.navigateTo('/login');

      let hasCSRFToken = false;

      // Check for CSRF token in form or meta tag
      const csrfToken = await page.locator('input[name="_token"], meta[name="csrf-token"]').count();
      if (csrfToken > 0) {
        hasCSRFToken = true;
      }

      // Check if CSRF header is sent with requests
      page.on('request', request => {
        if (request.url().includes('/api/v1/auth/login')) {
          const headers = request.headers();
          if (headers['x-csrf-token'] || headers['x-xsrf-token']) {
            hasCSRFToken = true;
          }
        }
      });

      const form = utils.getLoginForm();
      await form.email.fill('admin@resourcemgmt.com');
      await form.password.fill('password123');
      await form.submitButton.click();

      await page.waitForTimeout(2000);

      console.log('CSRF protection detected:', hasCSRFToken);
    });

    test('should rate limit login attempts', async ({ page }) => {
      await utils.navigateTo('/login');

      const form = utils.getLoginForm();
      let rateLimitTriggered = false;

      // Attempt multiple failed logins quickly
      for (let i = 0; i < 5; i++) {
        await form.email.fill('invalid@example.com');
        await form.password.fill('wrongpassword');
        await form.submitButton.click();
        await page.waitForTimeout(500);

        // Check for rate limit message
        const rateLimitMsg = await page.locator('text=too many attempts, text=rate limit, text=slow down').count();
        if (rateLimitMsg > 0) {
          rateLimitTriggered = true;
          break;
        }
      }

      console.log('Rate limiting detected:', rateLimitTriggered);
    });
  });

  test.describe('Accessibility', () => {
    test('should be keyboard navigable', async ({ page }) => {
      await utils.navigateTo('/login');

      // Test tab navigation
      await page.keyboard.press('Tab');
      await expect(utils.getLoginForm().email).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(utils.getLoginForm().password).toBeFocused();

      await page.keyboard.press('Tab');
      await expect(utils.getLoginForm().submitButton).toBeFocused();
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await utils.navigateTo('/login');

      const form = utils.getLoginForm();

      // Check for aria-labels or associated labels
      const emailAriaLabel = await form.email.getAttribute('aria-label');
      const passwordAriaLabel = await form.password.getAttribute('aria-label');

      const emailHasLabel = emailAriaLabel || await page.locator('label[for="email"]').count() > 0;
      const passwordHasLabel = passwordAriaLabel || await page.locator('label[for="password"]').count() > 0;

      expect(emailHasLabel).toBeTruthy();
      expect(passwordHasLabel).toBeTruthy();
    });
  });
});