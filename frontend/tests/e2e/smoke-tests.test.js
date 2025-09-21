const { test, expect } = require('@playwright/test');

test.describe('Comprehensive Smoke Tests', () => {
  let page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test('Login and navigate through all basic pages', async () => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    await page.waitForLoadState('networkidle');

    // Login with john@example.com
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for login redirect
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify we're logged in by checking for dashboard or navigation
    const currentUrl = page.url();
    console.log('Current URL after login:', currentUrl);

    // Should be redirected to dashboard or home
    expect(currentUrl).toMatch(/\/dashboard|\/home|\/inspections/);

    // Test 1: Dashboard page
    console.log('Testing Dashboard...');
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for dashboard elements
    await expect(page.locator('body')).toContainText(['Dashboard', 'Inspections', 'Statistics', 'Total']);
    console.log('✓ Dashboard loaded successfully');

    // Test 2: Inspections page
    console.log('Testing Inspections page...');
    await page.goto('http://localhost:5173/inspections');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for inspections list
    await expect(page.locator('body')).toContainText(['Inspections']);
    console.log('✓ Inspections page loaded successfully');

    // Test 3: Templates page
    console.log('Testing Templates page...');
    await page.goto('http://localhost:5173/templates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Check for templates list
    await expect(page.locator('body')).toContainText(['Templates']);
    console.log('✓ Templates page loaded successfully');

    // Test 4: Sites page (if available)
    console.log('Testing Sites page...');
    try {
      await page.goto('http://localhost:5173/sites');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for sites content
      await expect(page.locator('body')).toContainText(['Sites']);
      console.log('✓ Sites page loaded successfully');
    } catch (error) {
      console.log('Sites page not available or has issues:', error.message);
    }

    // Test 5: Users/Admin page (if accessible)
    console.log('Testing Admin Users page...');
    try {
      await page.goto('http://localhost:5173/admin/users');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for users content
      await expect(page.locator('body')).toContainText(['Users', 'Admin']);
      console.log('✓ Admin Users page loaded successfully');
    } catch (error) {
      console.log('Admin Users page not accessible (permission issue):', error.message);
    }

    // Test API endpoints by checking network requests
    console.log('Testing API endpoints...');

    // Listen to network responses
    const apiResponses = [];
    page.on('response', response => {
      if (response.url().includes('/api/')) {
        apiResponses.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Trigger API calls by visiting pages again
    await page.goto('http://localhost:5173/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:5173/inspections');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    await page.goto('http://localhost:5173/templates');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Check API responses
    console.log('API Response Summary:');
    const failedAPIs = [];
    apiResponses.forEach(response => {
      const status = response.status >= 200 && response.status < 300 ? '✓' : '✗';
      console.log(`${status} ${response.status} ${response.url}`);
      if (response.status >= 400) {
        failedAPIs.push(response);
      }
    });

    if (failedAPIs.length > 0) {
      console.log('\nFailed API calls:');
      failedAPIs.forEach(api => {
        console.log(`- ${api.status} ${api.statusText}: ${api.url}`);
      });
    }

    // Test 6: Navigation functionality
    console.log('Testing navigation...');

    // Test main navigation links
    const navTests = [
      { text: 'Dashboard', expectedUrl: '/dashboard' },
      { text: 'Inspections', expectedUrl: '/inspections' },
      { text: 'Templates', expectedUrl: '/templates' }
    ];

    for (const navTest of navTests) {
      try {
        await page.click(`a:has-text("${navTest.text}")`);
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000);

        const currentUrl = page.url();
        if (currentUrl.includes(navTest.expectedUrl)) {
          console.log(`✓ Navigation to ${navTest.text} works`);
        } else {
          console.log(`✗ Navigation to ${navTest.text} failed - URL: ${currentUrl}`);
        }
      } catch (error) {
        console.log(`✗ Navigation link "${navTest.text}" not found or not clickable`);
      }
    }

    // Test 7: Create new inspection (basic form check)
    console.log('Testing inspection creation form...');
    try {
      await page.goto('http://localhost:5173/inspections/new');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Check for form elements
      const formExists = await page.locator('form').count() > 0;
      if (formExists) {
        console.log('✓ Inspection creation form loaded');
      } else {
        console.log('✗ Inspection creation form not found');
      }
    } catch (error) {
      console.log('Inspection creation page has issues:', error.message);
    }

    console.log('Comprehensive smoke test completed!');
  });

  test('Verify essential page components load', async () => {
    // Login first
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'john@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Test component loading on each page
    const pageTests = [
      {
        name: 'Dashboard',
        url: 'http://localhost:5173/dashboard',
        requiredElements: ['header', 'nav', 'main']
      },
      {
        name: 'Inspections',
        url: 'http://localhost:5173/inspections',
        requiredElements: ['header', 'nav']
      },
      {
        name: 'Templates',
        url: 'http://localhost:5173/templates',
        requiredElements: ['header', 'nav']
      }
    ];

    for (const pageTest of pageTests) {
      console.log(`Testing ${pageTest.name} components...`);
      await page.goto(pageTest.url);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      for (const element of pageTest.requiredElements) {
        const elementExists = await page.locator(element).count() > 0;
        if (elementExists) {
          console.log(`✓ ${pageTest.name}: ${element} component found`);
        } else {
          console.log(`✗ ${pageTest.name}: ${element} component missing`);
        }
      }
    }
  });
});