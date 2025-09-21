import { test, expect } from '@playwright/test';

test('Full inspection creation workflow', async ({ page }) => {
  const consoleErrors = [];
  const networkErrors = [];
  const apiRequests = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('request', request => {
    if (request.url().includes('/api/')) {
      apiRequests.push({
        url: request.url(),
        method: request.method(),
        headers: request.headers()
      });
    }
  });

  page.on('response', response => {
    if (response.url().includes('/api/') && !response.ok()) {
      networkErrors.push({
        url: response.url(),
        status: response.status(),
        statusText: response.statusText()
      });
    }
  });

  try {
    // Login first
    console.log('→ Logging in');
    await page.goto('http://localhost:5173/login');
    await page.fill('input[type="email"]', 'admin@testorg.com');
    await page.fill('input[type="password"]', 'password123');

    const loginButton = page.locator('button[type="submit"], button:has-text("Login")');
    await loginButton.click();
    await page.waitForURL(/\/dashboard|\/inspections/, { timeout: 10000 });
    console.log('✓ Login successful');

    // Navigate to new inspection page
    console.log('→ Navigating to inspection creation');
    await page.goto('http://localhost:5173/inspections/new');
    await page.waitForTimeout(1000);

    // Check if InspectionCreate component loaded
    const createTitle = page.locator('text=Create New Inspection');
    await expect(createTitle).toBeVisible();
    console.log('✓ InspectionCreate component loaded');

    // Wait for templates to load
    console.log('→ Waiting for templates to load');

    // Check for loading state first
    const loadingText = page.locator('text=Loading templates...');
    if (await loadingText.isVisible()) {
      console.log('→ Templates loading...');
      await page.waitForTimeout(3000);
    }

    // Check if templates loaded successfully
    const selectTemplate = page.locator('text=Select Inspection Template');
    const errorText = page.locator('text=Failed to load templates');
    const noTemplatesText = page.locator('text=No templates available');

    if (await selectTemplate.isVisible()) {
      console.log('✓ Template selection available');

      // Look for template cards
      const templateCards = page.locator('.template-card');
      const cardCount = await templateCards.count();
      console.log(`→ Found ${cardCount} template cards`);

      if (cardCount > 0) {
        // Click on the first template
        console.log('→ Selecting first template');
        await templateCards.first().click();

        // Wait for the form to load
        await page.waitForTimeout(1000);

        // Check if form loaded
        const formContainer = page.locator('.form-container');
        if (await formContainer.isVisible()) {
          console.log('✓ Dynamic form loaded');
        } else {
          console.log('✗ Dynamic form not loaded');
        }
      }
    } else if (await errorText.isVisible()) {
      console.log('✗ Failed to load templates');
    } else if (await noTemplatesText.isVisible()) {
      console.log('! No templates available - need to seed templates');
    } else {
      console.log('? Unknown template state');
    }

    // Log API requests
    console.log('API requests made:');
    apiRequests.forEach(req => {
      const hasAuth = req.headers.authorization ? '✓ AUTH' : '✗ NO AUTH';
      console.log(`  ${req.method} ${req.url} (${hasAuth})`);
    });

    // Log any errors
    if (consoleErrors.length > 0) {
      console.log('Console errors:');
      consoleErrors.forEach(error => console.log(`  - ${error}`));
    }

    if (networkErrors.length > 0) {
      console.log('Network errors:');
      networkErrors.forEach(error => console.log(`  - ${error.url}: ${error.status} ${error.statusText}`));
    }

    // Take screenshot
    await page.screenshot({ path: '/tmp/full-workflow-test.png', fullPage: true });
    console.log('Screenshot saved to /tmp/full-workflow-test.png');

  } catch (error) {
    console.error('Test failed:', error.message);
    await page.screenshot({ path: '/tmp/workflow-error.png' });
    throw error;
  }
});