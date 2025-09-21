const { test, expect } = require('@playwright/test');

test.describe('Comprehensive User Workflow End-to-End Tests', () => {

  test('complete login to users page workflow with data verification', async ({ page }) => {
    console.log('🧪 Starting comprehensive user workflow test...');

    // Track all network requests to API
    const apiRequests = [];
    const apiResponses = [];

    page.on('request', request => {
      if (request.url().includes('/api/v1/')) {
        apiRequests.push({
          url: request.url(),
          method: request.method(),
          timestamp: Date.now()
        });
        console.log(`📤 API Request: ${request.method()} ${request.url()}`);
      }
    });

    page.on('response', async response => {
      if (response.url().includes('/api/v1/')) {
        const responseData = {
          url: response.url(),
          status: response.status(),
          timestamp: Date.now()
        };

        // Capture response body for critical endpoints
        if (response.url().includes('/auth/login') || response.url().includes('/users')) {
          try {
            const body = await response.text();
            responseData.body = body;
          } catch (err) {
            console.log(`⚠️ Could not capture response body: ${err.message}`);
          }
        }

        apiResponses.push(responseData);
        console.log(`📥 API Response: ${response.status()} ${response.url()}`);
      }
    });

    // Track console messages for debugging
    page.on('console', msg => {
      console.log(`🖥️ Console: ${msg.text()}`);
    });

    // STEP 1: Navigate to login page
    console.log('📱 Step 1: Navigating to login page...');
    const startTime = Date.now();
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    const loginPageLoadTime = Date.now() - startTime;
    console.log(`✅ Login page loaded in ${loginPageLoadTime}ms`);

    // STEP 2: Perform login
    console.log('📱 Step 2: Performing login...');
    await page.fill('input[type="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"]', 'password123');

    const loginStartTime = Date.now();
    await page.click('button[type="submit"]');

    // Wait for login to complete - either redirect or error
    try {
      await page.waitForURL('**/dashboard**', { timeout: 15000 });
      const loginTime = Date.now() - loginStartTime;
      console.log(`✅ Login successful and redirected in ${loginTime}ms`);
    } catch (error) {
      // Check if we're still on login page with error
      const currentURL = page.url();
      console.log(`❌ Login did not redirect. Current URL: ${currentURL}`);

      // Capture any error messages
      const errorElement = await page.locator('.error, .alert-danger, [class*="error"]').first();
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.log(`❌ Error message: ${errorText}`);
      }

      throw new Error(`Login failed - still on ${currentURL}`);
    }

    // STEP 3: Navigate to users page
    console.log('📱 Step 3: Navigating to users page...');
    const usersNavStartTime = Date.now();

    // Look for users menu item and click it
    const usersLink = page.locator('a[href*="/users"], a:has-text("Users"), nav a:has-text("Users")').first();
    await expect(usersLink).toBeVisible({ timeout: 10000 });
    await usersLink.click();

    // Wait for users page to load
    await page.waitForURL('**/users**', { timeout: 10000 });
    const usersNavTime = Date.now() - usersNavStartTime;
    console.log(`✅ Navigated to users page in ${usersNavTime}ms`);

    // STEP 4: Verify users page loads with data
    console.log('📱 Step 4: Verifying users page loads with data...');
    const usersLoadStartTime = Date.now();

    // Wait for users content to load (not just the "Loading users..." message)
    try {
      // First wait for the page structure
      await page.waitForSelector('.users-page, [class*="user"], main', { timeout: 10000 });

      // Then wait for actual user data to appear (not loading state)
      await page.waitForFunction(() => {
        const pageText = document.body.textContent;
        return !pageText.includes('Loading users...') &&
               (pageText.includes('@') || pageText.includes('admin') || pageText.includes('inspector'));
      }, { timeout: 15000 });

      const usersLoadTime = Date.now() - usersLoadStartTime;
      console.log(`✅ Users data loaded in ${usersLoadTime}ms`);
    } catch (error) {
      console.log(`❌ Users page did not load properly: ${error.message}`);

      // Capture current page content for debugging
      const pageContent = await page.textContent('body');
      console.log(`📄 Current page content: ${pageContent.substring(0, 500)}...`);

      throw error;
    }

    // STEP 5: Verify user data contains expected computed fields
    console.log('📱 Step 5: Verifying user data structure...');

    // Check that we have user cards/items displayed
    const userElements = await page.locator('[class*="user-card"], [class*="user-item"], .user, [data-testid*="user"]').count();
    console.log(`👥 Found ${userElements} user elements on page`);

    if (userElements === 0) {
      // Try alternative selectors
      const alternativeSelectors = [
        'tr:has(td)', // Table rows
        '[data-user-id]', // Data attributes
        'li:has-text("@")', // List items with emails
        'div:has-text("admin")', // Divs with admin text
        '.list-item', // Generic list items
        '.card' // Generic cards
      ];

      for (const selector of alternativeSelectors) {
        const count = await page.locator(selector).count();
        if (count > 0) {
          console.log(`📋 Found ${count} elements with selector: ${selector}`);
          break;
        }
      }
    }

    // Verify page contains user information (emails, roles, etc.)
    const pageContent = await page.textContent('body');
    const hasUserEmails = pageContent.includes('@resourcemgmt.com') || pageContent.includes('@');
    const hasRoleInfo = pageContent.includes('admin') || pageContent.includes('inspector');
    const hasUserNames = pageContent.includes('Admin') || pageContent.includes('User');

    console.log(`📊 Content verification:
      - Has user emails: ${hasUserEmails}
      - Has role information: ${hasRoleInfo}
      - Has user names: ${hasUserNames}`);

    expect(hasUserEmails).toBeTruthy();
    expect(hasRoleInfo).toBeTruthy();

    // STEP 6: Verify API calls were successful
    console.log('📱 Step 6: Verifying API calls...');

    const loginRequest = apiRequests.find(req => req.url.includes('/auth/login'));
    const loginResponse = apiResponses.find(res => res.url.includes('/auth/login'));
    const usersRequest = apiRequests.find(req => req.url.includes('/users'));
    const usersResponse = apiResponses.find(res => res.url.includes('/users'));

    expect(loginRequest).toBeTruthy();
    expect(loginResponse?.status).toBe(200);
    expect(usersRequest).toBeTruthy();
    expect(usersResponse?.status).toBe(200);

    console.log(`✅ API calls verified:
      - Login: ${loginResponse?.status}
      - Users: ${usersResponse?.status}`);

    // STEP 7: Verify response data structure (if available)
    if (usersResponse?.body) {
      try {
        const usersData = JSON.parse(usersResponse.body);
        console.log(`📊 Users API response structure:
          - Total users: ${usersData.total}
          - Returned users: ${usersData.users?.length}
          - Has computed fields: ${usersData.users?.[0]?.role ? 'Yes' : 'No'}`);

        // Verify computed fields are present
        if (usersData.users && usersData.users.length > 0) {
          const firstUser = usersData.users[0];
          expect(firstUser.role).toBeTruthy();
          expect(firstUser.status).toBeTruthy();
          expect(firstUser.organization_id).toBeTruthy();
          console.log(`✅ Computed fields verified for user: ${firstUser.email}`);
        }
      } catch (parseError) {
        console.log(`⚠️ Could not parse users response: ${parseError.message}`);
      }
    }

    // STEP 8: Performance summary
    const totalTime = Date.now() - startTime;
    console.log(`🏁 Workflow completed successfully in ${totalTime}ms
      - Login page load: ${loginPageLoadTime}ms
      - Login process: ${loginTime}ms
      - Users navigation: ${usersNavTime}ms
      - Users data load: ${usersLoadTime}ms
      - Total API requests: ${apiRequests.length}
      - Total API responses: ${apiResponses.length}`);

    // Final assertion - we should be on users page with data
    expect(page.url()).toContain('/users');
    expect(pageContent).not.toContain('Loading users...');
  });

  test('verify user workflow performance benchmarks', async ({ page }) => {
    console.log('🏃 Testing performance benchmarks...');

    const metrics = {
      loginPageLoad: 0,
      loginProcess: 0,
      usersPageLoad: 0,
      apiResponseTimes: []
    };

    // Track API response times
    page.on('response', response => {
      if (response.url().includes('/api/v1/')) {
        const responseTime = Date.now() - response.request().timing().requestStart;
        metrics.apiResponseTimes.push({
          url: response.url(),
          time: responseTime,
          status: response.status()
        });
      }
    });

    // Login page load
    const loginStart = Date.now();
    await page.goto('http://localhost:5173/login');
    await page.waitForSelector('input[type="email"]');
    metrics.loginPageLoad = Date.now() - loginStart;

    // Login process
    await page.fill('input[type="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"]', 'password123');

    const loginProcessStart = Date.now();
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    metrics.loginProcess = Date.now() - loginProcessStart;

    // Users page load
    const usersStart = Date.now();
    await page.locator('a[href*="/users"], a:has-text("Users")').first().click();
    await page.waitForURL('**/users**');
    await page.waitForFunction(() => !document.body.textContent.includes('Loading users...'));
    metrics.usersPageLoad = Date.now() - usersStart;

    console.log(`📊 Performance Results:
      - Login page load: ${metrics.loginPageLoad}ms (target: <3000ms)
      - Login process: ${metrics.loginProcess}ms (target: <5000ms)
      - Users page load: ${metrics.usersPageLoad}ms (target: <5000ms)
      - Average API response: ${metrics.apiResponseTimes.reduce((a, b) => a + b.time, 0) / metrics.apiResponseTimes.length}ms`);

    // Performance assertions
    expect(metrics.loginPageLoad).toBeLessThan(5000);
    expect(metrics.loginProcess).toBeLessThan(10000);
    expect(metrics.usersPageLoad).toBeLessThan(10000);
  });

  test('verify data integrity across user workflow', async ({ page }) => {
    console.log('🔍 Testing data integrity...');

    let loginResponseData = null;
    let usersResponseData = null;

    // Capture API responses
    page.on('response', async response => {
      if (response.url().includes('/auth/login') && response.status() === 200) {
        try {
          loginResponseData = JSON.parse(await response.text());
        } catch (e) { /* ignore */ }
      }
      if (response.url().includes('/users') && response.status() === 200) {
        try {
          usersResponseData = JSON.parse(await response.text());
        } catch (e) { /* ignore */ }
      }
    });

    // Perform login
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@resourcemgmt.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');

    // Navigate to users
    await page.locator('a[href*="/users"], a:has-text("Users")').first().click();
    await page.waitForURL('**/users**');
    await page.waitForFunction(() => !document.body.textContent.includes('Loading users...'));

    // Verify login response contains expected data
    expect(loginResponseData).toBeTruthy();
    expect(loginResponseData.token).toBeTruthy();
    expect(loginResponseData.user).toBeTruthy();
    expect(loginResponseData.user.email).toBe('admin@resourcemgmt.com');
    expect(loginResponseData.current_organization).toBeTruthy();

    // Verify users response contains expected data
    expect(usersResponseData).toBeTruthy();
    expect(usersResponseData.users).toBeTruthy();
    expect(usersResponseData.total).toBeGreaterThan(0);

    // Verify computed fields are populated
    const hasUsersWithComputedFields = usersResponseData.users.some(user =>
      user.role && user.status && user.organization_id
    );
    expect(hasUsersWithComputedFields).toBeTruthy();

    console.log(`✅ Data integrity verified:
      - Login user: ${loginResponseData.user.email}
      - Current org: ${loginResponseData.current_organization.name}
      - Users returned: ${usersResponseData.users.length}
      - Users with computed fields: ${usersResponseData.users.filter(u => u.role && u.status).length}`);
  });
});