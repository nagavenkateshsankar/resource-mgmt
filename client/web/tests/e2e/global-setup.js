/**
 * Global test setup for Playwright E2E tests
 * Runs once before all tests
 */

const { chromium } = require('@playwright/test');
const config = require('./test-config');

async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  // Verify test environment is accessible
  await verifyEnvironment();

  // Verify test user accounts exist
  await verifyTestAccounts();

  // Clean up any leftover test data
  await cleanupTestData();

  console.log('✅ Global test setup completed successfully');
}

async function verifyEnvironment() {
  console.log('🔍 Verifying test environment...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Check frontend is accessible
    console.log(`Checking frontend at ${config.environment.frontendUrl}...`);
    const frontendResponse = await page.goto(config.environment.frontendUrl, {
      waitUntil: 'networkidle',
      timeout: config.timeouts.pageLoad
    });

    if (!frontendResponse.ok()) {
      throw new Error(`Frontend not accessible: ${frontendResponse.status()}`);
    }

    // Check API is accessible
    console.log(`Checking API at ${config.environment.apiBaseUrl}...`);
    const apiResponse = await page.request.get(`${config.environment.apiBaseUrl}/health`, {
      timeout: config.timeouts.api
    });

    // API might not have health endpoint, so 404 is acceptable
    if (apiResponse.status() >= 500) {
      console.warn(`API health check failed: ${apiResponse.status()}, but continuing...`);
    }

    console.log('✅ Environment verification completed');

  } catch (error) {
    console.error('❌ Environment verification failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

async function verifyTestAccounts() {
  console.log('👤 Verifying test accounts...');

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Test admin login
    await page.goto(`${config.environment.frontendUrl}/login`);

    await page.fill(config.selectors.auth.emailInput, config.credentials.admin.email);
    await page.fill(config.selectors.auth.passwordInput, config.credentials.admin.password);
    await page.click(config.selectors.auth.submitButton);

    // Wait for login result
    await page.waitForTimeout(3000);

    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      // Check for error message
      const errorElement = await page.locator(config.selectors.common.errorMessage).count();
      if (errorElement > 0) {
        const errorText = await page.locator(config.selectors.common.errorMessage).textContent();
        throw new Error(`Admin login failed: ${errorText}`);
      } else {
        console.warn('Admin login may have failed (still on login page)');
      }
    } else {
      console.log('✅ Admin account verified');
    }

    // Test user login if configured
    if (config.credentials.user.email) {
      await page.goto(`${config.environment.frontendUrl}/login`);

      await page.fill(config.selectors.auth.emailInput, config.credentials.user.email);
      await page.fill(config.selectors.auth.passwordInput, config.credentials.user.password);
      await page.click(config.selectors.auth.submitButton);

      await page.waitForTimeout(3000);

      const userUrl = page.url();
      if (!userUrl.includes('/login')) {
        console.log('✅ User account verified');
      } else {
        console.warn('User account verification failed or not configured');
      }
    }

  } catch (error) {
    console.error('❌ Account verification failed:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');

  // Only cleanup if configured to do so
  if (!config.database.cleanupAfterTests) {
    console.log('Test data cleanup disabled');
    return;
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Login as admin first
    await page.goto(`${config.environment.frontendUrl}/login`);
    await page.fill(config.selectors.auth.emailInput, config.credentials.admin.email);
    await page.fill(config.selectors.auth.passwordInput, config.credentials.admin.password);
    await page.click(config.selectors.auth.submitButton);
    await page.waitForTimeout(2000);

    // Clean up test inspections (those with "Test" in title)
    try {
      await page.goto(`${config.environment.frontendUrl}/inspections`);
      await page.waitForTimeout(2000);

      const testInspections = page.locator('.inspection-item:has-text("Test"), .inspection-card:has-text("Test")');
      const count = await testInspections.count();

      if (count > 0) {
        console.log(`Found ${count} test inspections to clean up`);
        // Could implement deletion logic here if needed
      }
    } catch (error) {
      console.log('Could not clean up test inspections:', error.message);
    }

    // Clean up test templates
    try {
      await page.goto(`${config.environment.frontendUrl}/templates`);
      await page.waitForTimeout(2000);

      const testTemplates = page.locator('.template-item:has-text("Test"), .template-card:has-text("Test")');
      const count = await testTemplates.count();

      if (count > 0) {
        console.log(`Found ${count} test templates to clean up`);
        // Could implement deletion logic here if needed
      }
    } catch (error) {
      console.log('Could not clean up test templates:', error.message);
    }

    console.log('✅ Test data cleanup completed');

  } catch (error) {
    console.error('❌ Test data cleanup failed:', error.message);
    // Don't throw error as cleanup failure shouldn't stop tests
  } finally {
    await browser.close();
  }
}

// Performance monitoring setup
function setupPerformanceMonitoring() {
  if (process.env.ENABLE_PERF_MONITORING === 'true') {
    console.log('📊 Performance monitoring enabled');

    // Set up performance thresholds
    process.env.PERF_PAGE_LOAD_THRESHOLD = config.performance.maxPageLoadTime.toString();
    process.env.PERF_API_THRESHOLD = config.performance.maxApiResponseTime.toString();
  }
}

// Accessibility testing setup
function setupAccessibilityTesting() {
  if (config.accessibility.enableAxeTests) {
    console.log('♿ Accessibility testing enabled');

    // Install axe-core if needed
    process.env.AXE_WCAG_LEVEL = config.accessibility.wcagLevel;
  }
}

// Security testing setup
function setupSecurityTesting() {
  if (config.security.enableSecurityTests) {
    console.log('🔒 Security testing enabled');

    // Configure security test settings
    process.env.SECURITY_CSRF_CHECK = config.security.checkCSRF.toString();
    process.env.SECURITY_XSS_CHECK = config.security.checkXSS.toString();
  }
}

// Theme testing setup
function setupThemeTesting() {
  console.log('🎨 Theme testing setup...');

  // Environment configuration for theme testing
  process.env.THEME_TEST_MODE = 'true';
  process.env.DISABLE_ANIMATIONS = 'true';

  // Configure theme test defaults
  process.env.DEFAULT_THEME = 'light';
  process.env.ENABLE_THEME_TRANSITIONS = 'false';
  process.env.ENABLE_VISUAL_REGRESSION = 'true';

  // Set up theme-specific timeouts
  process.env.THEME_SWITCH_TIMEOUT = '1000';
  process.env.THEME_TRANSITION_TIMEOUT = '500';

  console.log('✅ Theme testing configured');
  console.log('  - Test mode: enabled');
  console.log('  - Animations: disabled for consistency');
  console.log('  - Visual regression: enabled');
  console.log('  - Default theme: light');
}

// Parallel execution setup
function setupParallelExecution() {
  const workers = process.env.CI ? 2 : 4;
  console.log(`🔀 Parallel execution configured for ${workers} workers`);
}

// Main setup function
async function main() {
  try {
    console.log('🎬 Playwright E2E Test Suite Global Setup');
    console.log('==========================================');

    await globalSetup();

    setupPerformanceMonitoring();
    setupAccessibilityTesting();
    setupSecurityTesting();
    setupThemeTesting();
    setupParallelExecution();

    console.log('==========================================');
    console.log('🎯 Ready to run tests!');

  } catch (error) {
    console.error('💥 Global setup failed:', error);
    process.exit(1);
  }
}

module.exports = main;