const { test, expect } = require('@playwright/test');

test.describe('Basic API Smoke Tests', () => {
  let authToken = '';

  test('Login via API and test endpoints', async ({ request }) => {
    console.log('Testing login API...');

    // Login via API
    const loginResponse = await request.post('http://localhost:3007/api/v1/auth/login', {
      data: {
        email: 'john@example.com',
        password: 'password123'
      }
    });

    console.log('Login response status:', loginResponse.status());
    const loginData = await loginResponse.json();
    console.log('Login response:', loginData);

    if (loginResponse.status() === 200 && loginData.token) {
      authToken = loginData.token;
      console.log('✓ Login successful, token obtained');

      // Test Templates API
      console.log('\nTesting Templates API...');
      const templatesResponse = await request.get('http://localhost:3007/api/v1/templates', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('Templates API status:', templatesResponse.status());
      if (templatesResponse.status() === 200) {
        const templatesData = await templatesResponse.json();
        console.log('✓ Templates API working, returned', templatesData.templates?.length || 0, 'templates');
      } else {
        const error = await templatesResponse.text();
        console.log('✗ Templates API failed:', error);
      }

      // Test Inspections API
      console.log('\nTesting Inspections API...');
      const inspectionsResponse = await request.get('http://localhost:3007/api/v1/inspections', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('Inspections API status:', inspectionsResponse.status());
      if (inspectionsResponse.status() === 200) {
        const inspectionsData = await inspectionsResponse.json();
        console.log('✓ Inspections API working, returned', inspectionsData.inspections?.length || 0, 'inspections');
      } else {
        const error = await inspectionsResponse.text();
        console.log('✗ Inspections API failed:', error);
      }

      // Test Sites API
      console.log('\nTesting Sites API...');
      const sitesResponse = await request.get('http://localhost:3007/api/v1/sites', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('Sites API status:', sitesResponse.status());
      if (sitesResponse.status() === 200) {
        const sitesData = await sitesResponse.json();
        console.log('✓ Sites API working, returned', sitesData.sites?.length || 0, 'sites');
      } else {
        const error = await sitesResponse.text();
        console.log('✗ Sites API failed:', error);
      }

      // Test Dashboard/Analytics API
      console.log('\nTesting Analytics API...');
      const analyticsResponse = await request.get('http://localhost:3007/api/v1/analytics/dashboard', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('Analytics API status:', analyticsResponse.status());
      if (analyticsResponse.status() === 200) {
        const analyticsData = await analyticsResponse.json();
        console.log('✓ Analytics API working, data keys:', Object.keys(analyticsData));
      } else {
        const error = await analyticsResponse.text();
        console.log('✗ Analytics API failed:', error);
      }

      // Test Users API
      console.log('\nTesting Users API...');
      const usersResponse = await request.get('http://localhost:3007/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      console.log('Users API status:', usersResponse.status());
      if (usersResponse.status() === 200) {
        const usersData = await usersResponse.json();
        console.log('✓ Users API working, returned', usersData.users?.length || 0, 'users');
      } else {
        const error = await usersResponse.text();
        console.log('✗ Users API failed (may be permission issue):', error);
      }

    } else {
      console.log('✗ Login failed');
      throw new Error('Login failed: ' + JSON.stringify(loginData));
    }
  });

  test('Test frontend pages load', async ({ page }) => {
    console.log('Testing frontend page loads...');

    // First get an auth token
    const loginResponse = await page.request.post('http://localhost:3007/api/v1/auth/login', {
      data: {
        email: 'john@example.com',
        password: 'password123'
      }
    });

    const loginData = await loginResponse.json();
    if (loginResponse.status() === 200 && loginData.token) {
      // Set localStorage token to simulate login
      await page.addInitScript((token) => {
        localStorage.setItem('authToken', token);
        localStorage.setItem('user', JSON.stringify({
          id: 'user-id',
          email: 'john@example.com',
          name: 'John Doe'
        }));
      }, loginData.token);

      // Test each page
      const pages = [
        { name: 'Login', url: 'http://localhost:5173/login' },
        { name: 'Dashboard', url: 'http://localhost:5173/dashboard' },
        { name: 'Inspections', url: 'http://localhost:5173/inspections' },
        { name: 'Templates', url: 'http://localhost:5173/templates' }
      ];

      for (const pageTest of pages) {
        console.log(`Testing ${pageTest.name} page...`);
        try {
          await page.goto(pageTest.url);
          await page.waitForLoadState('networkidle', { timeout: 10000 });

          const title = await page.title();
          const hasContent = await page.locator('body').textContent();

          if (hasContent && hasContent.length > 100) {
            console.log(`✓ ${pageTest.name} page loaded successfully (title: ${title})`);
          } else {
            console.log(`✗ ${pageTest.name} page may have issues (minimal content)`);
          }
        } catch (error) {
          console.log(`✗ ${pageTest.name} page failed to load:`, error.message);
        }
      }
    } else {
      console.log('✗ Could not get auth token for frontend tests');
    }
  });
});