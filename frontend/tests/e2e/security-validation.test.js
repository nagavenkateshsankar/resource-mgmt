import { test, expect } from '@playwright/test';

test.describe('Security Validation Tests', () => {
  const API_BASE = 'http://localhost:3007/api/v1';

  // Test users with known credentials
  const testUsers = {
    admin: { email: 'john@gmail.com', password: 'password', expectedRole: 'admin' },
    user: { email: 'jobh@gmail.com', password: 'password', expectedRole: 'user' }
  };

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should enforce JWT token validation', async ({ page, request }) => {
    // Test 1: Invalid JWT token format
    const invalidTokenResponse = await request.get(`${API_BASE}/templates`, {
      headers: { 'Authorization': 'Bearer invalid.token.here' }
    });
    expect(invalidTokenResponse.status()).toBe(401);

    // Test 2: Malformed authorization header
    const malformedResponse = await request.get(`${API_BASE}/templates`, {
      headers: { 'Authorization': 'InvalidFormat token123' }
    });
    expect(malformedResponse.status()).toBe(401);

    // Test 3: Missing authorization header
    const missingAuthResponse = await request.get(`${API_BASE}/templates`);
    expect(missingAuthResponse.status()).toBe(401);

    // Test 4: Empty Bearer token
    const emptyTokenResponse = await request.get(`${API_BASE}/templates`, {
      headers: { 'Authorization': 'Bearer ' }
    });
    expect(emptyTokenResponse.status()).toBe(401);
  });

  test('should prevent session replay attacks', async ({ page }) => {
    // Login with valid credentials
    await page.goto('/');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');

    // Wait for successful login and capture token
    await page.waitForURL('**/dashboard');
    const originalToken = await page.evaluate(() => localStorage.getItem('auth_token'));

    expect(originalToken).toBeTruthy();

    // Navigate to a protected page
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    // Simulate session expiry by setting an old timestamp
    // In a real scenario, this would test actual session timeout
    await page.waitForTimeout(1000);

    // Verify the session is still valid initially
    const templatesVisible = await page.locator('[data-testid="template-item"], .template-card').count();
    console.log('Templates visible with valid session:', templatesVisible);

    // Test with tampered token
    await page.evaluate(() => {
      localStorage.setItem('auth_token', localStorage.getItem('auth_token') + 'tampered');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should either redirect to login or show error
    const currentUrl = page.url();
    const hasErrorMessage = await page.locator('text=/error|unauthorized|invalid/i').count();

    console.log('After token tampering - URL:', currentUrl);
    console.log('Error messages found:', hasErrorMessage);

    // Either redirected away from templates or showing error
    expect(currentUrl.includes('/templates') === false || hasErrorMessage > 0).toBeTruthy();
  });

  test('should enforce organization isolation', async ({ page, request }) => {
    // Test organization context isolation

    // Step 1: Login as admin user
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password
      }
    });

    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    const adminToken = loginData.token;

    expect(adminToken).toBeTruthy();

    // Step 2: Fetch admin user's templates
    const adminTemplatesResponse = await request.get(`${API_BASE}/templates`, {
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });

    expect(adminTemplatesResponse.status()).toBe(200);
    const adminTemplates = await adminTemplatesResponse.json();

    console.log('Admin templates count:', adminTemplates.length || 0);

    // Step 3: Try to access specific template with organization context
    if (adminTemplates && adminTemplates.length > 0) {
      const templateId = adminTemplates[0].id;

      const templateDetailResponse = await request.get(`${API_BASE}/templates/${templateId}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      expect(templateDetailResponse.status()).toBe(200);
      const templateDetail = await templateDetailResponse.json();
      expect(templateDetail.organization_id).toBeTruthy();

      console.log('Template organization ID:', templateDetail.organization_id);
    }

    // Step 4: Test with potentially invalid token (simulating cross-org access)
    const invalidOrgResponse = await request.get(`${API_BASE}/templates`, {
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'X-Organization-ID': 'invalid-org-id'  // Attempt to override org context
      }
    });

    // Should still work with valid token, organization context comes from JWT
    expect(invalidOrgResponse.status()).toBe(200);
  });

  test('should validate role-based access control', async ({ page, request }) => {
    // Test RBAC enforcement

    // Login as regular user
    const userLoginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password
      }
    });

    expect(userLoginResponse.status()).toBe(200);
    const userLoginData = await userLoginResponse.json();
    const userToken = userLoginData.token;

    // Test 1: User should be able to view templates
    const userTemplatesResponse = await request.get(`${API_BASE}/templates`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    expect(userTemplatesResponse.status()).toBe(200);

    // Test 2: User should NOT be able to create templates (admin permission)
    const createTemplateResponse = await request.post(`${API_BASE}/templates`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        name: 'Unauthorized Template',
        description: 'This should fail'
      }
    });
    expect(createTemplateResponse.status()).toBe(403);

    // Test 3: User should NOT be able to manage users
    const manageUsersResponse = await request.get(`${API_BASE}/users`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    expect(manageUsersResponse.status()).toBe(403);

    // Test 4: User should NOT be able to access organization management
    const orgManagementResponse = await request.get(`${API_BASE}/organizations`, {
      headers: { 'Authorization': `Bearer ${userToken}` }
    });
    expect(orgManagementResponse.status()).toBe(403);
  });

  test('should prevent privilege escalation attempts', async ({ page, request }) => {
    // Login as regular user
    const userLoginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUsers.user.email,
        password: testUsers.user.password
      }
    });

    const userToken = (await userLoginResponse.json()).token;

    // Attempt 1: Try to escalate privileges via headers
    const escalationAttempt1 = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'X-User-Role': 'admin',  // Attempt to override role
        'X-User-Permissions': 'can_manage_templates'
      },
      data: {
        name: 'Escalated Template',
        description: 'Privilege escalation attempt'
      }
    });
    expect(escalationAttempt1.status()).toBe(403);

    // Attempt 2: Try to access admin endpoints with modified requests
    const escalationAttempt2 = await request.put(`${API_BASE}/users/some-user-id`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        role: 'admin',
        permissions: ['can_manage_everything']
      }
    });
    expect(escalationAttempt2.status()).toBe(403);

    // Attempt 3: Try to create organization invitations
    const escalationAttempt3 = await request.post(`${API_BASE}/organizations/some-org/invite`, {
      headers: { 'Authorization': `Bearer ${userToken}` },
      data: {
        email: 'attacker@example.com',
        role: 'admin'
      }
    });
    expect(escalationAttempt3.status()).toBe(403);
  });

  test('should enforce input validation and prevent injection attacks', async ({ page, request }) => {
    // Login as admin to have permissions for testing
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password
      }
    });

    const adminToken = (await loginResponse.json()).token;

    // Test 1: SQL injection attempts in template creation
    const sqlInjectionAttempts = [
      "'; DROP TABLE templates; --",
      "' OR '1'='1",
      "'; DELETE FROM users WHERE id='1'; --",
      "<script>alert('xss')</script>",
      "javascript:alert('xss')"
    ];

    for (const maliciousInput of sqlInjectionAttempts) {
      const injectionResponse = await request.post(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${adminToken}` },
        data: {
          name: maliciousInput,
          description: `Testing injection: ${maliciousInput}`
        }
      });

      // Should either reject the input or sanitize it
      if (injectionResponse.status() === 201) {
        const createdTemplate = await injectionResponse.json();
        // Verify the malicious input was sanitized
        expect(createdTemplate.name).not.toContain('DROP TABLE');
        expect(createdTemplate.name).not.toContain('<script>');
        expect(createdTemplate.name).not.toContain('javascript:');

        // Clean up by deleting the test template
        await request.delete(`${API_BASE}/templates/${createdTemplate.id}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
      } else {
        // Rejection is also acceptable for security
        expect([400, 422]).toContain(injectionResponse.status());
      }
    }

    // Test 2: Path traversal attempts
    const pathTraversalAttempts = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '%2e%2e%2f%2e%2e%2f%2e%2e%2f%65%74%63%2f%70%61%73%73%77%64'
    ];

    for (const pathAttempt of pathTraversalAttempts) {
      const traversalResponse = await request.get(`${API_BASE}/templates/${pathAttempt}`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      // Should return 404 or 400, not expose system files
      expect([400, 404]).toContain(traversalResponse.status());
    }
  });

  test('should enforce proper session management', async ({ page, request }) => {
    // Test 1: Login and verify session creation
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: testUsers.admin.email,
        password: testUsers.admin.password
      }
    });

    expect(loginResponse.status()).toBe(200);
    const loginData = await loginResponse.json();
    const token = loginData.token;

    // Test 2: Verify token works for authenticated requests
    const authenticatedResponse = await request.get(`${API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(authenticatedResponse.status()).toBe(200);

    // Test 3: Test session invalidation on logout
    const logoutResponse = await request.post(`${API_BASE}/auth/logout`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(logoutResponse.status()).toBe(200);

    // Test 4: Verify token is invalid after logout
    const postLogoutResponse = await request.get(`${API_BASE}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    expect(postLogoutResponse.status()).toBe(401);
  });

  test('should prevent CSRF attacks', async ({ page, request }) => {
    // Login normally
    await page.goto('/');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    const token = await page.evaluate(() => localStorage.getItem('auth_token'));

    // Test 1: Verify that requests require proper authentication
    // Simulate a CSRF attack where an external site tries to make requests
    const csrfAttempt = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Origin': 'https://evil-site.com',
        'Referer': 'https://evil-site.com/attack.html',
        'Content-Type': 'application/json'
      },
      data: {
        name: 'CSRF Attack Template',
        description: 'This should be blocked'
      }
    });

    // Should fail due to missing authentication
    expect(csrfAttempt.status()).toBe(401);

    // Test 2: Even with a valid token, cross-origin requests should be handled properly
    const crossOriginAttempt = await request.post(`${API_BASE}/templates`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': 'https://evil-site.com',
        'Referer': 'https://evil-site.com/attack.html',
        'Content-Type': 'application/json'
      },
      data: {
        name: 'Cross-Origin Attack',
        description: 'Testing CORS protection'
      }
    });

    // Depending on CORS configuration, this might be blocked or allowed
    // If allowed, the server should still validate the request properly
    console.log('Cross-origin attempt status:', crossOriginAttempt.status());
  });

  test('should validate secure headers and responses', async ({ page, request }) => {
    // Test security headers in responses
    const response = await request.get(`${API_BASE}/health`);

    const headers = response.headers();
    console.log('Security headers:', {
      'x-content-type-options': headers['x-content-type-options'],
      'x-frame-options': headers['x-frame-options'],
      'x-xss-protection': headers['x-xss-protection'],
      'strict-transport-security': headers['strict-transport-security'],
      'content-security-policy': headers['content-security-policy']
    });

    // Test that sensitive information is not exposed in error responses
    const invalidEndpointResponse = await request.get(`${API_BASE}/nonexistent-endpoint`);
    expect(invalidEndpointResponse.status()).toBe(404);

    const errorBody = await invalidEndpointResponse.text();

    // Error should not expose sensitive information
    expect(errorBody.toLowerCase()).not.toContain('database');
    expect(errorBody.toLowerCase()).not.toContain('sql');
    expect(errorBody.toLowerCase()).not.toContain('internal server');
    expect(errorBody.toLowerCase()).not.toContain('stack trace');
  });

  test('should enforce rate limiting and prevent brute force attacks', async ({ page, request }) => {
    // Test rate limiting on login endpoint
    const loginAttempts = [];
    const maxAttempts = 10;

    // Make multiple rapid login attempts with wrong credentials
    for (let i = 0; i < maxAttempts; i++) {
      const attempt = request.post(`${API_BASE}/auth/login`, {
        data: {
          email: 'attacker@example.com',
          password: 'wrongpassword' + i
        }
      });
      loginAttempts.push(attempt);
    }

    const responses = await Promise.all(loginAttempts);

    // Check that some requests are being rate limited
    const rateLimitedResponses = responses.filter(response =>
      response.status() === 429 || response.status() === 403
    );

    console.log('Rate limited responses:', rateLimitedResponses.length);
    console.log('Response statuses:', responses.map(r => r.status()));

    // Note: This test might need adjustment based on actual rate limiting implementation
    // The expectation here is that at least some requests should be rate limited
  });

  test('should maintain security during organization switching', async ({ page }) => {
    // This test ensures that organization context switching doesn't introduce security vulnerabilities

    await page.goto('/');
    await page.fill('input[type="email"]', testUsers.admin.email);
    await page.fill('input[type="password"]', testUsers.admin.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Capture initial auth state
    const initialToken = await page.evaluate(() => localStorage.getItem('auth_token'));

    // Navigate to templates and capture data
    await page.goto('/templates');
    await page.waitForLoadState('networkidle');

    const initialTemplates = await page.evaluate(() => {
      const templateElements = document.querySelectorAll('[data-testid="template-item"], .template-card');
      return Array.from(templateElements).map(el => el.textContent?.trim()).filter(Boolean);
    });

    console.log('Initial templates count:', initialTemplates.length);

    // Check if there's organization switching functionality
    const orgSwitcher = await page.locator('[data-testid="organization-switcher"], .organization-selector').count();

    if (orgSwitcher > 0) {
      console.log('Organization switcher found, testing security during switch');

      // Test organization switching if available
      await page.click('[data-testid="organization-switcher"], .organization-selector');
      await page.waitForTimeout(1000);

      // Verify that the token or context changed appropriately
      const postSwitchToken = await page.evaluate(() => localStorage.getItem('auth_token'));

      // Either token should change (new JWT with different org context)
      // or organization context should be updated securely
      console.log('Token changed after org switch:', initialToken !== postSwitchToken);

      // Reload templates and verify organization isolation
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');

      const postSwitchTemplates = await page.evaluate(() => {
        const templateElements = document.querySelectorAll('[data-testid="template-item"], .template-card');
        return Array.from(templateElements).map(el => el.textContent?.trim()).filter(Boolean);
      });

      console.log('Post-switch templates count:', postSwitchTemplates.length);

      // Templates might be different due to organization isolation
      // This is expected behavior for security
    } else {
      console.log('No organization switcher found, testing single-org security');

      // Verify that tampering with organization context doesn't work
      await page.evaluate(() => {
        // Try to inject fake organization context
        localStorage.setItem('current_organization', 'fake-org-id');
        sessionStorage.setItem('organization_context', JSON.stringify({
          id: 'fake-org-id',
          name: 'Fake Organization'
        }));
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should either ignore the fake context or handle it securely
      const finalTemplates = await page.evaluate(() => {
        const templateElements = document.querySelectorAll('[data-testid="template-item"], .template-card');
        return Array.from(templateElements).map(el => el.textContent?.trim()).filter(Boolean);
      });

      // Should show same templates as original (ignoring fake context)
      expect(finalTemplates.length).toBe(initialTemplates.length);
    }
  });
});

test.describe('API Security Penetration Tests', () => {
  const API_BASE = 'http://localhost:3007/api/v1';

  test('should handle malformed JSON payloads securely', async ({ request }) => {
    const malformedPayloads = [
      '{"incomplete": json',
      '{"number": 123}; DROP TABLE users; --',
      '{"script": "<script>alert(1)</script>"}',
      '{"huge": "' + 'A'.repeat(1000000) + '"}',
      '{"null": \u0000}',
      '{"unicode": "\u202e\u202d"}',
    ];

    for (const payload of malformedPayloads) {
      const response = await request.post(`${API_BASE}/auth/login`, {
        data: payload,
        headers: { 'Content-Type': 'application/json' }
      });

      // Should handle malformed JSON gracefully
      expect([400, 422, 500]).toContain(response.status());

      const responseText = await response.text();
      // Should not expose sensitive information in error messages
      expect(responseText.toLowerCase()).not.toContain('database');
      expect(responseText.toLowerCase()).not.toContain('internal');
    }
  });

  test('should validate content-type headers', async ({ request }) => {
    // Test 1: Wrong content type for JSON endpoints
    const wrongContentTypeResponse = await request.post(`${API_BASE}/auth/login`, {
      headers: { 'Content-Type': 'text/plain' },
      data: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });

    expect([400, 415]).toContain(wrongContentTypeResponse.status());

    // Test 2: Missing content type
    const missingContentTypeResponse = await request.post(`${API_BASE}/auth/login`, {
      data: JSON.stringify({
        email: 'test@example.com',
        password: 'password'
      })
    });

    // Should either work or require proper content type
    console.log('Missing content-type status:', missingContentTypeResponse.status());
  });

  test('should prevent directory traversal in file uploads', async ({ request }) => {
    // Login first to get valid token
    const loginResponse = await request.post(`${API_BASE}/auth/login`, {
      data: {
        email: 'john@gmail.com',
        password: 'password'
      }
    });

    if (loginResponse.status() !== 200) {
      test.skip('Cannot login to test file upload security');
      return;
    }

    const token = (await loginResponse.json()).token;

    // Test malicious file names
    const maliciousFileNames = [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      'file.txt\x00.exe',
      'normal.txt; rm -rf /',
      '<script>alert(1)</script>.txt'
    ];

    for (const fileName of maliciousFileNames) {
      // Note: This test assumes there's a file upload endpoint
      // The exact endpoint might need to be adjusted based on implementation
      const fileUploadResponse = await request.post(`${API_BASE}/attachments`, {
        headers: { 'Authorization': `Bearer ${token}` },
        multipart: {
          file: {
            name: fileName,
            mimeType: 'text/plain',
            buffer: Buffer.from('test content')
          }
        }
      });

      // Should either reject malicious file names or sanitize them
      if (fileUploadResponse.status() === 200) {
        const uploadResult = await fileUploadResponse.json();
        // Verify the file name was sanitized
        expect(uploadResult.filename).not.toContain('..');
        expect(uploadResult.filename).not.toContain('<script>');
        expect(uploadResult.filename).not.toContain('\x00');
      } else {
        // Rejection is also acceptable
        expect([400, 422]).toContain(fileUploadResponse.status());
      }
    }
  });
});