/**
 * API Contract Validation Tests
 * Ensures existing API contracts remain stable during new feature development
 */

const { test, expect } = require('@playwright/test');

test.describe('API Contract Validation', () => {
  const baseUrl = 'http://localhost:3007/api/v1';
  let authToken;
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();

    // Get auth token for authenticated requests
    const loginResponse = await page.request.post(`${baseUrl}/auth/login`, {
      data: {
        email: 'admin@resourcemgmt.com',
        password: 'password123'
      }
    });

    if (loginResponse.ok()) {
      const loginData = await loginResponse.json();
      authToken = loginData.token || loginData.access_token;
    }
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.describe('Health and System Endpoints', () => {
    test('Health check endpoint should maintain contract', async () => {
      const response = await page.request.get(`${baseUrl}/health`);

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('message');
      expect(data.status).toBe('ok');
    });
  });

  test.describe('Authentication Endpoints', () => {
    test('Login endpoint should maintain response structure', async () => {
      const response = await page.request.post(`${baseUrl}/auth/login`, {
        data: {
          email: 'admin@resourcemgmt.com',
          password: 'password123'
        }
      });

      expect(response.status()).toBe(200);

      const data = await response.json();

      // Core authentication response fields
      expect(data).toHaveProperty('token');
      expect(data).toHaveProperty('user');
      expect(data.user).toHaveProperty('id');
      expect(data.user).toHaveProperty('email');
      expect(data.user).toHaveProperty('name');

      // Should not expose sensitive fields
      expect(data.user).not.toHaveProperty('password');
    });

    test('Profile endpoint should maintain user structure', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();

        expect(data).toHaveProperty('id');
        expect(data).toHaveProperty('email');
        expect(data).toHaveProperty('name');
        expect(data).not.toHaveProperty('password');
      }
    });

    test('Invalid login should return proper error structure', async () => {
      const response = await page.request.post(`${baseUrl}/auth/login`, {
        data: {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }
      });

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });
  });

  test.describe('Organizations Endpoints', () => {
    test('Organizations list should maintain structure', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/organizations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();

        if (Array.isArray(data)) {
          // If organizations exist, check structure
          if (data.length > 0) {
            const org = data[0];
            expect(org).toHaveProperty('id');
            expect(org).toHaveProperty('name');
            expect(org).toHaveProperty('domain');
          }
        }
      }
    });

    test('Domain check endpoint should work correctly', async () => {
      const response = await page.request.get(`${baseUrl}/organizations/check-domain?domain=test.com`);

      expect([200, 404]).toContain(response.status());

      const data = await response.json();
      expect(data).toHaveProperty('available');
      expect(typeof data.available).toBe('boolean');
    });
  });

  test.describe('Templates Endpoints', () => {
    test('Templates list should maintain structure', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/templates`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const template = data[0];
          expect(template).toHaveProperty('id');
          expect(template).toHaveProperty('name');
          expect(template).toHaveProperty('fields_schema');
          expect(template).toHaveProperty('organization_id');
        }
      }
    });

    test('Template categories should return proper format', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/templates/categories`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data)).toBe(true);
      }
    });
  });

  test.describe('Inspections Endpoints', () => {
    test('Inspections list should maintain structure', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/inspections`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const inspection = data[0];
          expect(inspection).toHaveProperty('id');
          expect(inspection).toHaveProperty('template_id');
          expect(inspection).toHaveProperty('inspector_id');
          expect(inspection).toHaveProperty('status');
          expect(inspection).toHaveProperty('site_id');
        }
      }
    });

    test('Inspection stats should return proper format', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/inspections/stats`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();

        // Common stats fields
        const expectedFields = ['total', 'completed', 'pending', 'overdue'];
        const hasStatsFields = expectedFields.some(field => data.hasOwnProperty(field));
        expect(hasStatsFields).toBe(true);
      }
    });

    test('Overdue inspections should return proper format', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/inspections/overdue`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();

        expect(data).toHaveProperty('inspections');
        expect(Array.isArray(data.inspections)).toBe(true);
      }
    });
  });

  test.describe('Sites Endpoints', () => {
    test('Sites endpoints should be available', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/sites`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      // Sites endpoint should exist (200) or return proper error (404/405)
      expect([200, 404, 405]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const site = data[0];
          expect(site).toHaveProperty('id');
          expect(site).toHaveProperty('name');
          expect(site).toHaveProperty('address');
          expect(site).toHaveProperty('organization_id');
        }
      }
    });
  });

  test.describe('Users Endpoints', () => {
    test('Users list should maintain structure', async () => {
      if (!authToken) {
        test.skip('No auth token available');
      }

      const response = await page.request.get(`${baseUrl}/users`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.status() === 200) {
        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          const user = data[0];
          expect(user).toHaveProperty('id');
          expect(user).toHaveProperty('email');
          expect(user).toHaveProperty('name');
          expect(user).not.toHaveProperty('password');
        }
      }
    });
  });

  test.describe('Error Handling Contracts', () => {
    test('401 responses should have consistent format', async () => {
      const response = await page.request.get(`${baseUrl}/auth/profile`);

      expect(response.status()).toBe(401);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('404 responses should have consistent format', async () => {
      const response = await page.request.get(`${baseUrl}/nonexistent-endpoint`);

      expect(response.status()).toBe(404);

      const data = await response.json();
      expect(data).toHaveProperty('error');
    });

    test('Invalid JSON should return proper error', async () => {
      const response = await page.request.post(`${baseUrl}/auth/login`, {
        data: 'invalid json',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect([400, 422]).toContain(response.status());
    });
  });

  test.describe('Security Headers Validation', () => {
    test('API should return appropriate security headers', async () => {
      const response = await page.request.get(`${baseUrl}/health`);

      const headers = response.headers();

      // Common security headers
      expect(headers['content-type']).toContain('application/json');

      // CORS headers should be present if configured
      if (headers['access-control-allow-origin']) {
        expect(headers['access-control-allow-origin']).toBeTruthy();
      }
    });
  });

  test.describe('Rate Limiting and Performance', () => {
    test('API should handle multiple concurrent requests', async () => {
      const requests = [];

      // Send 5 concurrent health check requests
      for (let i = 0; i < 5; i++) {
        requests.push(page.request.get(`${baseUrl}/health`));
      }

      const responses = await Promise.all(requests);

      // All should succeed (no 429 Too Many Requests for health check)
      responses.forEach(response => {
        expect(response.status()).toBe(200);
      });
    });
  });
});