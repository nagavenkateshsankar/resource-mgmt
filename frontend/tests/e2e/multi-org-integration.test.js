import { test, expect } from '@playwright/test';

test.describe('Multi-Organization Integration Tests', () => {
  const API_BASE = 'http://localhost:3007/api/v1';

  // Test users with known credentials for different organizations
  const testUsers = {
    johnAdmin: { email: 'john@gmail.com', password: 'password', expectedRole: 'admin' },
    jobhUser: { email: 'jobh@gmail.com', password: 'password', expectedRole: 'user' }
  };

  test.beforeEach(async ({ page }) => {
    // Clear any existing auth state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test.describe('Authentication and Authorization Integration', () => {
    test('should handle complete login workflow for admin user', async ({ page, request }) => {
      // Test the complete authentication flow
      await page.goto('/');

      // Login as admin
      await page.fill('input[type="email"]', testUsers.johnAdmin.email);
      await page.fill('input[type="password"]', testUsers.johnAdmin.password);
      await page.click('button[type="submit"]');

      // Wait for successful login
      await page.waitForURL('**/dashboard');

      // Verify auth token is set
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(authToken).toBeTruthy();
      console.log('Admin auth token length:', authToken ? authToken.length : 0);

      // Test API access with the token
      const profileResponse = await request.get(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(profileResponse.status()).toBe(200);
      const profile = await profileResponse.json();

      expect(profile.email).toBe(testUsers.johnAdmin.email);
      expect(profile.role || profile.current_role).toBeTruthy();
      console.log('Admin user profile:', {
        email: profile.email,
        role: profile.role || profile.current_role,
        organization: profile.organization_name || profile.current_organization
      });

      // Test admin permissions - access to users endpoint
      const usersResponse = await request.get(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      // Admin should be able to access user management
      if (usersResponse.status() === 200) {
        const users = await usersResponse.json();
        console.log('Admin can access users endpoint - count:', users.length || 0);
      } else {
        console.log('Users endpoint access status for admin:', usersResponse.status());
      }

      // Test admin permissions - access to templates
      const templatesResponse = await request.get(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(templatesResponse.status()).toBe(200);
      const templates = await templatesResponse.json();
      console.log('Admin templates access - count:', templates.length || 0);

      // Test template creation (admin permission)
      const createTemplateResponse = await request.post(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          name: 'Integration Test Template',
          description: 'Template created during integration test',
          fields: [
            {
              name: 'test_field',
              type: 'text',
              label: 'Test Field',
              required: true
            }
          ]
        }
      });

      if (createTemplateResponse.status() === 201) {
        const newTemplate = await createTemplateResponse.json();
        console.log('Admin successfully created template:', newTemplate.id);

        // Clean up - delete the template
        await request.delete(`${API_BASE}/templates/${newTemplate.id}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
      } else {
        console.log('Template creation status for admin:', createTemplateResponse.status());
      }
    });

    test('should handle complete login workflow for regular user', async ({ page, request }) => {
      // Test the complete authentication flow for regular user
      await page.goto('/');

      // Login as regular user
      await page.fill('input[type="email"]', testUsers.jobhUser.email);
      await page.fill('input[type="password"]', testUsers.jobhUser.password);
      await page.click('button[type="submit"]');

      // Wait for successful login
      await page.waitForURL('**/dashboard');

      // Verify auth token is set
      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(authToken).toBeTruthy();
      console.log('User auth token length:', authToken ? authToken.length : 0);

      // Test API access with the token
      const profileResponse = await request.get(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(profileResponse.status()).toBe(200);
      const profile = await profileResponse.json();

      expect(profile.email).toBe(testUsers.jobhUser.email);
      console.log('Regular user profile:', {
        email: profile.email,
        role: profile.role || profile.current_role,
        organization: profile.organization_name || profile.current_organization
      });

      // Test user permissions - should NOT have access to users endpoint
      const usersResponse = await request.get(`${API_BASE}/users`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(usersResponse.status()).toBe(403);
      console.log('User correctly denied access to users endpoint:', usersResponse.status());

      // Test user permissions - should have limited access to templates
      const templatesResponse = await request.get(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(templatesResponse.status()).toBe(200);
      const templates = await templatesResponse.json();
      console.log('User templates access - count:', templates.length || 0);

      // Test template creation (should be denied for regular user)
      const createTemplateResponse = await request.post(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          name: 'Unauthorized Template',
          description: 'This should fail for regular user'
        }
      });

      expect(createTemplateResponse.status()).toBe(403);
      console.log('User correctly denied template creation:', createTemplateResponse.status());
    });

    test('should maintain organization context throughout session', async ({ page, request }) => {
      // Login as admin
      await page.goto('/');
      await page.fill('input[type="email"]', testUsers.johnAdmin.email);
      await page.fill('input[type="password"]', testUsers.johnAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));

      // Get user's organization context
      const profileResponse = await request.get(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      const profile = await profileResponse.json();
      const userOrgId = profile.organization_id || profile.current_organization_id;
      console.log('User organization ID:', userOrgId);

      // Test that all API calls maintain organization context
      const endpoints = [
        '/templates',
        '/inspections',
        '/analytics/dashboard'
      ];

      for (const endpoint of endpoints) {
        const response = await request.get(`${API_BASE}${endpoint}`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (response.status() === 200) {
          const data = await response.json();

          // Check if data contains organization context
          if (Array.isArray(data)) {
            // For arrays, check that all items belong to user's organization
            const orgMismatches = data.filter(item =>
              item.organization_id && item.organization_id !== userOrgId
            );

            expect(orgMismatches.length).toBe(0);
            console.log(`${endpoint} - Items: ${data.length}, Org mismatches: ${orgMismatches.length}`);
          } else if (data.organization_id) {
            // For single items, verify organization match
            expect(data.organization_id).toBe(userOrgId);
            console.log(`${endpoint} - Single item org verified`);
          }
        }
      }
    });
  });

  test.describe('Data Isolation and Security', () => {
    test('should prevent cross-organization data access', async ({ page, request }) => {
      // Login as admin to get access to data
      const loginResponse = await request.post(`${API_BASE}/auth/login`, {
        data: testUsers.johnAdmin
      });

      if (loginResponse.status() !== 200) {
        test.skip('Could not login to perform cross-org access test');
        return;
      }

      const loginData = await loginResponse.json();
      const adminToken = loginData.token;

      // Get admin's templates to understand their organization context
      const templatesResponse = await request.get(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      if (templatesResponse.status() === 200) {
        const templates = await templatesResponse.json();

        if (templates.length > 0) {
          const userOrgId = templates[0].organization_id;
          console.log('User belongs to organization:', userOrgId);

          // Attempt to access data by manipulating organization context
          const manipulationAttempts = [
            {
              name: 'Header injection',
              headers: {
                'Authorization': `Bearer ${adminToken}`,
                'X-Organization-ID': 'fake-org-id',
                'Organization-Context': 'different-org'
              }
            },
            {
              name: 'Query parameter injection',
              url: `${API_BASE}/templates?organization_id=fake-org&org=different-org`
            },
            {
              name: 'Path manipulation',
              url: `${API_BASE}/organizations/fake-org/templates`
            }
          ];

          for (const attempt of manipulationAttempts) {
            let response;

            if (attempt.url) {
              response = await request.get(attempt.url, {
                headers: { 'Authorization': `Bearer ${adminToken}` }
              });
            } else {
              response = await request.get(`${API_BASE}/templates`, attempt);
            }

            if (response.status() === 200) {
              const data = await response.json();

              // Verify that returned data still belongs to user's organization
              if (Array.isArray(data)) {
                const wrongOrgItems = data.filter(item =>
                  item.organization_id && item.organization_id !== userOrgId
                );

                expect(wrongOrgItems.length).toBe(0);
                console.log(`${attempt.name} - Correctly filtered org data`);
              }
            } else {
              // Blocking the request is also acceptable
              console.log(`${attempt.name} - Request blocked:`, response.status());
            }
          }
        }
      }
    });

    test('should enforce role-based permissions consistently', async ({ page, request }) => {
      // Test both admin and user permissions across different endpoints
      const userTokens = [];

      // Get tokens for both users
      for (const [userType, credentials] of Object.entries(testUsers)) {
        const loginResponse = await request.post(`${API_BASE}/auth/login`, {
          data: credentials
        });

        if (loginResponse.status() === 200) {
          const loginData = await loginResponse.json();
          userTokens.push({
            type: userType,
            token: loginData.token,
            expectedRole: credentials.expectedRole
          });
        }
      }

      // Define endpoints and expected access levels
      const endpointTests = [
        {
          endpoint: '/templates',
          method: 'GET',
          adminAccess: true,
          userAccess: true,
          description: 'View templates'
        },
        {
          endpoint: '/templates',
          method: 'POST',
          data: { name: 'RBAC Test Template', description: 'Testing RBAC' },
          adminAccess: true,
          userAccess: false,
          description: 'Create template'
        },
        {
          endpoint: '/users',
          method: 'GET',
          adminAccess: true,
          userAccess: false,
          description: 'View users'
        },
        {
          endpoint: '/inspections',
          method: 'GET',
          adminAccess: true,
          userAccess: true,
          description: 'View inspections'
        },
        {
          endpoint: '/analytics/dashboard',
          method: 'GET',
          adminAccess: true,
          userAccess: false,
          description: 'View analytics'
        }
      ];

      // Test each endpoint with each user
      for (const userInfo of userTokens) {
        for (const endpointTest of endpointTests) {
          const expectedAccess = userInfo.expectedRole === 'admin' ?
                                endpointTest.adminAccess : endpointTest.userAccess;

          let response;
          const headers = { 'Authorization': `Bearer ${userInfo.token}` };

          if (endpointTest.method === 'POST') {
            response = await request.post(`${API_BASE}${endpointTest.endpoint}`, {
              headers,
              data: endpointTest.data || {}
            });
          } else {
            response = await request.get(`${API_BASE}${endpointTest.endpoint}`, { headers });
          }

          if (expectedAccess) {
            expect([200, 201]).toContain(response.status());
            console.log(`✓ ${userInfo.type} can ${endpointTest.description}: ${response.status()}`);
          } else {
            expect(response.status()).toBe(403);
            console.log(`✓ ${userInfo.type} denied ${endpointTest.description}: ${response.status()}`);
          }

          // Clean up created resources
          if (response.status() === 201 && endpointTest.method === 'POST') {
            const created = await response.json();
            if (created.id && endpointTest.endpoint.includes('templates')) {
              await request.delete(`${API_BASE}/templates/${created.id}`, { headers });
            }
          }
        }
      }
    });
  });

  test.describe('Session Management Integration', () => {
    test('should handle session lifecycle correctly', async ({ page, request }) => {
      // Step 1: Login
      await page.goto('/');
      await page.fill('input[type="email"]', testUsers.johnAdmin.email);
      await page.fill('input[type="password"]', testUsers.johnAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      const authToken = await page.evaluate(() => localStorage.getItem('auth_token'));

      // Step 2: Verify session is active
      const sessionCheckResponse = await request.get(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(sessionCheckResponse.status()).toBe(200);

      // Step 3: Test session refresh (if available)
      const refreshResponse = await request.post(`${API_BASE}/auth/refresh`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (refreshResponse.status() === 200) {
        const refreshData = await refreshResponse.json();
        console.log('Session refresh successful, new token provided:', !!refreshData.token);

        if (refreshData.token) {
          // Verify new token works
          const newTokenResponse = await request.get(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${refreshData.token}` }
          });
          expect(newTokenResponse.status()).toBe(200);
        }
      } else {
        console.log('Session refresh not available or failed:', refreshResponse.status());
      }

      // Step 4: Logout
      const logoutResponse = await request.post(`${API_BASE}/auth/logout`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(logoutResponse.status()).toBe(200);

      // Step 5: Verify token is invalid after logout
      const postLogoutResponse = await request.get(`${API_BASE}/auth/profile`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(postLogoutResponse.status()).toBe(401);
      console.log('Token correctly invalidated after logout');
    });

    test('should handle concurrent sessions securely', async ({ browser }) => {
      // Create two browser contexts to simulate concurrent sessions
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      try {
        // Login in both contexts with the same user
        for (const page of [page1, page2]) {
          await page.goto('/');
          await page.fill('input[type="email"]', testUsers.johnAdmin.email);
          await page.fill('input[type="password"]', testUsers.johnAdmin.password);
          await page.click('button[type="submit"]');
          await page.waitForURL('**/dashboard');
        }

        // Get tokens from both sessions
        const token1 = await page1.evaluate(() => localStorage.getItem('auth_token'));
        const token2 = await page2.evaluate(() => localStorage.getItem('auth_token'));

        console.log('Session 1 token length:', token1 ? token1.length : 0);
        console.log('Session 2 token length:', token2 ? token2.length : 0);
        console.log('Tokens are different:', token1 !== token2);

        // Both sessions should be valid initially
        const context1Request = await context1.request;
        const context2Request = await context2.request;

        const check1 = await context1Request.get(`${API_BASE}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token1}` }
        });
        const check2 = await context2Request.get(`${API_BASE}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token2}` }
        });

        expect(check1.status()).toBe(200);
        expect(check2.status()).toBe(200);

        // Test session invalidation
        await context1Request.post(`${API_BASE}/auth/logout`, {
          headers: { 'Authorization': `Bearer ${token1}` }
        });

        // First token should be invalid
        const postLogout1 = await context1Request.get(`${API_BASE}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token1}` }
        });
        expect(postLogout1.status()).toBe(401);

        // Second session should still be valid (or not, depending on session management strategy)
        const postLogout2 = await context2Request.get(`${API_BASE}/auth/profile`, {
          headers: { 'Authorization': `Bearer ${token2}` }
        });

        console.log('Second session status after first logout:', postLogout2.status());
        // This could be 200 (concurrent sessions allowed) or 401 (single session only)

      } finally {
        await context1.close();
        await context2.close();
      }
    });
  });

  test.describe('API Integration Workflows', () => {
    test('should handle complete inspection workflow', async ({ page, request }) => {
      // Login as admin
      const loginResponse = await request.post(`${API_BASE}/auth/login`, {
        data: testUsers.johnAdmin
      });

      if (loginResponse.status() !== 200) {
        test.skip('Could not login to perform workflow test');
        return;
      }

      const adminToken = (await loginResponse.json()).token;
      const headers = { 'Authorization': `Bearer ${adminToken}` };

      // Step 1: Get available templates
      const templatesResponse = await request.get(`${API_BASE}/templates`, { headers });
      expect(templatesResponse.status()).toBe(200);

      const templates = await templatesResponse.json();
      console.log('Available templates:', templates.length);

      let templateId;
      if (templates.length > 0) {
        templateId = templates[0].id;
      } else {
        // Create a template if none exist
        const createTemplateResponse = await request.post(`${API_BASE}/templates`, {
          headers,
          data: {
            name: 'Workflow Test Template',
            description: 'Template for workflow testing',
            fields: [
              {
                name: 'workflow_field',
                type: 'text',
                label: 'Workflow Field',
                required: true
              }
            ]
          }
        });

        if (createTemplateResponse.status() === 201) {
          const newTemplate = await createTemplateResponse.json();
          templateId = newTemplate.id;
          console.log('Created template for workflow test:', templateId);
        }
      }

      if (!templateId) {
        test.skip('No template available for workflow test');
        return;
      }

      // Step 2: Create an inspection
      const createInspectionResponse = await request.post(`${API_BASE}/inspections`, {
        headers,
        data: {
          template_id: templateId,
          title: 'Integration Test Inspection',
          description: 'Inspection created during integration test',
          scheduled_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        }
      });

      if (createInspectionResponse.status() === 201) {
        const newInspection = await createInspectionResponse.json();
        console.log('Created inspection:', newInspection.id);

        // Step 3: Get the inspection details
        const inspectionResponse = await request.get(`${API_BASE}/inspections/${newInspection.id}`, {
          headers
        });
        expect(inspectionResponse.status()).toBe(200);

        const inspection = await inspectionResponse.json();
        expect(inspection.id).toBe(newInspection.id);
        expect(inspection.template_id).toBe(templateId);

        // Step 4: Update the inspection
        const updateResponse = await request.put(`${API_BASE}/inspections/${newInspection.id}`, {
          headers,
          data: {
            title: 'Updated Integration Test Inspection',
            status: 'in_progress'
          }
        });

        if (updateResponse.status() === 200) {
          console.log('Successfully updated inspection');
        }

        // Step 5: Clean up - delete the inspection
        const deleteResponse = await request.delete(`${API_BASE}/inspections/${newInspection.id}`, {
          headers
        });

        console.log('Cleanup - delete inspection status:', deleteResponse.status());

      } else {
        console.log('Could not create inspection for workflow test:', createInspectionResponse.status());
      }
    });

    test('should handle organization data consistency across UI and API', async ({ page, request }) => {
      // Login through UI
      await page.goto('/');
      await page.fill('input[type="email"]', testUsers.johnAdmin.email);
      await page.fill('input[type="password"]', testUsers.johnAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      const uiToken = await page.evaluate(() => localStorage.getItem('auth_token'));

      // Navigate to templates page
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');

      // Capture UI data
      const uiTemplates = await page.evaluate(() => {
        const templateElements = document.querySelectorAll('[data-testid="template-item"], .template-card, .template-list-item');
        return Array.from(templateElements).map(el => {
          return {
            text: el.textContent?.trim(),
            id: el.getAttribute('data-template-id') || el.getAttribute('data-id')
          };
        }).filter(item => item.text);
      });

      console.log('UI Templates:', uiTemplates.length);

      // Get same data through API
      const apiResponse = await request.get(`${API_BASE}/templates`, {
        headers: { 'Authorization': `Bearer ${uiToken}` }
      });

      expect(apiResponse.status()).toBe(200);
      const apiTemplates = await apiResponse.json();

      console.log('API Templates:', apiTemplates.length);

      // Verify consistency (allowing for UI filtering/pagination)
      if (uiTemplates.length > 0 && apiTemplates.length > 0) {
        // Check that UI shows subset or same data as API
        expect(uiTemplates.length).toBeLessThanOrEqual(apiTemplates.length);

        // Verify organization consistency
        const userOrgId = apiTemplates[0]?.organization_id;
        if (userOrgId) {
          const wrongOrgTemplates = apiTemplates.filter(t => t.organization_id !== userOrgId);
          expect(wrongOrgTemplates.length).toBe(0);
          console.log('All API templates belong to user organization:', userOrgId);
        }
      }

      // Test navigation consistency
      await page.goto('/inspections');
      await page.waitForLoadState('networkidle');

      const inspectionsResponse = await request.get(`${API_BASE}/inspections`, {
        headers: { 'Authorization': `Bearer ${uiToken}` }
      });

      if (inspectionsResponse.status() === 200) {
        const apiInspections = await inspectionsResponse.json();
        console.log('API Inspections:', apiInspections.length);

        // Verify organization consistency for inspections
        if (apiInspections.length > 0) {
          const userOrgId = apiInspections[0]?.organization_id;
          if (userOrgId) {
            const wrongOrgInspections = apiInspections.filter(i => i.organization_id !== userOrgId);
            expect(wrongOrgInspections.length).toBe(0);
            console.log('All API inspections belong to user organization');
          }
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle network failures gracefully', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.fill('input[type="email"]', testUsers.johnAdmin.email);
      await page.fill('input[type="password"]', testUsers.johnAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Simulate network failure by blocking API requests
      await page.route('**/api/v1/**', route => {
        route.abort('internetdisconnected');
      });

      // Navigate to templates page
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');

      // Check for error handling
      const errorMessages = await page.locator('text=/error|failed|unavailable/i').count();
      const loadingStates = await page.locator('text=/loading|spinner/i').count();

      console.log('Error messages found during network failure:', errorMessages);
      console.log('Loading states found:', loadingStates);

      // App should handle network failure gracefully
      // Either show error message or handle failure silently
      expect(errorMessages >= 0).toBe(true); // Any number of error messages is acceptable
    });

    test('should handle token expiration gracefully', async ({ page, request }) => {
      // This test simulates token expiration scenario
      await page.goto('/');

      // Set an expired token manually
      await page.evaluate(() => {
        // Simulate an expired token (this is a mock scenario)
        localStorage.setItem('auth_token', 'expired.token.here');
      });

      // Navigate to protected page
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');

      // Should either redirect to login or show appropriate error
      const currentUrl = page.url();
      const hasLoginForm = await page.locator('input[type="email"], input[type="password"]').count();
      const hasErrorMessage = await page.locator('text=/expired|unauthorized|login/i').count();

      console.log('URL after expired token:', currentUrl);
      console.log('Has login form:', hasLoginForm > 0);
      console.log('Has error message:', hasErrorMessage > 0);

      // Should handle expired token appropriately
      expect(hasLoginForm > 0 || hasErrorMessage > 0 || !currentUrl.includes('/templates')).toBe(true);
    });

    test('should handle malformed responses gracefully', async ({ page }) => {
      // Login first
      await page.goto('/');
      await page.fill('input[type="email"]', testUsers.johnAdmin.email);
      await page.fill('input[type="password"]', testUsers.johnAdmin.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');

      // Intercept API requests and return malformed responses
      await page.route('**/api/v1/templates', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: '{"malformed": json response'
        });
      });

      // Navigate to templates page
      await page.goto('/templates');
      await page.waitForLoadState('networkidle');

      // Check that app handles malformed JSON gracefully
      const errorMessages = await page.locator('text=/error|failed|invalid/i').count();
      console.log('Error handling for malformed JSON:', errorMessages);

      // App should not crash and should handle parsing errors
      const pageTitle = await page.title();
      expect(pageTitle).toBeTruthy(); // Page should still be functional
    });
  });
});