const { test, expect } = require('@playwright/test');

test.describe('Assignments Page', () => {
  test.beforeEach(async ({ page }) => {
    // Go to the app
    await page.goto('http://localhost:5173');

    // Wait for the page to load
    await page.waitForTimeout(1000);
  });

  test('should load the home page', async ({ page }) => {
    // Check if we can see the Site Inspector logo or login page
    const hasLogo = await page.getByText('Site Inspector').count() > 0;
    const hasLogin = await page.getByText('Login').count() > 0;

    expect(hasLogo || hasLogin).toBeTruthy();
    console.log('✅ Home page loaded successfully');
  });

  test('should be able to navigate to login', async ({ page }) => {
    // Try to find login elements
    const loginButton = page.getByRole('button', { name: /login/i }).first();
    const loginLink = page.getByRole('link', { name: /login/i }).first();
    const emailInput = page.getByRole('textbox', { name: /email/i }).first();

    // Check if we're already on login page or can navigate to it
    const isOnLoginPage = await emailInput.count() > 0;

    if (!isOnLoginPage) {
      // Try to navigate to login
      if (await loginButton.count() > 0) {
        await loginButton.click();
      } else if (await loginLink.count() > 0) {
        await loginLink.click();
      } else {
        // Navigate directly to login
        await page.goto('http://localhost:5173/login');
      }
    }

    // Wait for login page to load
    await page.waitForTimeout(1000);

    // Check if we can see login form
    const emailField = page.getByRole('textbox', { name: /email/i }).first();
    await expect(emailField).toBeVisible();
    console.log('✅ Login page accessible');
  });

  test('should test assignments page after login', async ({ page }) => {
    // Navigate to login page
    await page.goto('http://localhost:5173/login');
    await page.waitForTimeout(1000);

    // Try to login with test user
    const emailInput = page.getByRole('textbox', { name: /email/i }).first();
    const passwordInput = page.getByRole('textbox', { name: /password/i }).first();
    const loginButton = page.getByRole('button', { name: /login/i }).first();

    if (await emailInput.count() > 0) {
      await emailInput.fill('john.doe@acme.com');

      if (await passwordInput.count() > 0) {
        await passwordInput.fill('password123');
        await loginButton.click();

        // Wait for login to complete
        await page.waitForTimeout(2000);

        // Try to navigate to assignments
        await page.goto('http://localhost:5173/assignments');
        await page.waitForTimeout(2000);

        // Check if assignments page loads
        const assignmentsHeading = page.getByText(/assignments/i);
        const assignmentsPage = page.getByRole('main');

        console.log('Current URL:', page.url());
        console.log('Page title:', await page.title());

        // Take a screenshot for debugging
        await page.screenshot({ path: 'assignments-page-test.png', fullPage: true });

        const hasAssignmentsContent = await assignmentsHeading.count() > 0;
        console.log('Has assignments content:', hasAssignmentsContent);

        if (hasAssignmentsContent) {
          console.log('✅ Assignments page loaded successfully');
        } else {
          console.log('❌ Assignments page not found, checking for error messages...');

          // Check for common error messages
          const errorMessages = await page.getByText(/error|permission|denied|not found/i).allTextContents();
          console.log('Error messages found:', errorMessages);

          // Check if we're redirected to login
          const isOnLogin = await page.getByText(/login/i).count() > 0;
          console.log('Redirected to login:', isOnLogin);
        }
      }
    } else {
      console.log('❌ Login form not found');
    }
  });

  test('should check backend API connectivity', async ({ page }) => {
    // Test direct API call to assignments endpoint
    const response = await page.request.get('http://localhost:3007/api/v1/health');
    const healthStatus = response.status();
    console.log('Backend health status:', healthStatus);

    expect(healthStatus).toBe(200);
    console.log('✅ Backend API is accessible');
  });
});