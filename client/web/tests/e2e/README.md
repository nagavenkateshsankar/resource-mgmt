# E2E Test Suite - Resource Management Application

This directory contains comprehensive end-to-end tests for the Resource Management application using Playwright.

## Overview

The test suite has been completely cleaned up and restructured to provide:
- **Comprehensive coverage** of all UI functionality
- **Reliable and maintainable** test patterns
- **Standardized utilities** for consistent testing
- **Proper setup and teardown** for test isolation
- **Performance and security validation**

## Test Structure

### Core Test Files

| File | Purpose | Coverage |
|------|---------|----------|
| `authentication.test.js` | User authentication flows | Login, logout, session management, security |
| `navigation.test.js` | Application navigation | Routing, breadcrumbs, mobile navigation, accessibility |
| `users-management.test.js` | User management functionality | User listing, search, filtering, actions |
| `inspections-management.test.js` | Inspection functionality | CRUD operations, templates, workflows |
| `templates-management.test.js` | Template management | Template creation, versioning, usage |

### Legacy/Specialized Tests

| File | Purpose | Notes |
|------|---------|-------|
| `user-workflow.test.js` | Complete user workflows | End-to-end scenarios |
| `user-management.test.js` | Legacy user tests | Comprehensive user scenarios |
| `smoke-tests.test.js` | Basic smoke testing | Quick health checks |
| `api-smoke-tests.test.js` | API integration tests | Backend connectivity |
| `multi-org-integration.test.js` | Multi-organization features | Tenant isolation |
| `multi-tenant-isolation.test.js` | Tenant security | Data isolation |
| `role-management.test.js` | Role-based access control | Permission testing |
| `security-validation.test.js` | Security testing | XSS, CSRF, injection prevention |

### Utility Files

| File | Purpose |
|------|---------|
| `test-utils.js` | Common test utilities and selectors |
| `test-config.js` | Centralized test configuration |
| `global-setup.js` | Test suite initialization |
| `global-teardown.js` | Test suite cleanup |

## Quick Start

### Prerequisites

1. **Application running locally:**
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:3007`

2. **Test credentials configured:**
   - Admin: `admin@resourcemgmt.com` / `password123`
   - User: `john@example.com` / `password123`

### Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test authentication.test.js

# Run tests in headed mode (see browser)
npx playwright test --headed

# Run tests with UI mode
npx playwright test --ui

# Run only Chromium tests
npx playwright test --project=chromium

# Run tests in parallel
npx playwright test --workers=4
```

### Environment Variables

```bash
# Browser configuration
export ALL_BROWSERS=true          # Run tests on all browsers
export MOBILE_TESTS=true          # Include mobile testing
export SLOW_MO=500                # Slow down actions (ms)
export DEVTOOLS=true              # Open browser devtools

# Test configuration
export PWTEST_WORKERS=2           # Number of parallel workers
export CI=true                    # CI environment optimizations

# Feature flags
export ENABLE_PERF_MONITORING=true
export SECURITY_TESTS=true
```

## Test Utilities

### TestUtils Class

The `TestUtils` class provides standardized methods for common test operations:

```javascript
const { TestUtils } = require('./test-utils');

test('example test', async ({ page }) => {
  const utils = new TestUtils(page);

  // Authentication
  await utils.loginAsAdmin();
  await utils.loginAsUser('email@example.com', 'password');

  // Navigation
  await utils.navigateTo('/users');
  const nav = utils.getNavigation();
  await nav.dashboard.click();

  // Page utilities
  const usersPage = utils.getUsersPage();
  await expect(usersPage.heading).toBeVisible();

  // Error handling
  await utils.expectErrorMessage('Invalid credentials');

  // Screenshots
  await utils.takeScreenshot('test-state');
});
```

### Common Selectors

Standardized selectors are defined in `test-config.js`:

```javascript
const config = require('./test-config');

// Use consistent selectors
await page.locator(config.selectors.auth.emailInput).fill('email');
await page.locator(config.selectors.navigation.dashboard).click();
```

## Test Categories

### 🔐 Authentication Tests
- Login/logout functionality
- Session persistence
- Error handling
- Security validation
- Multi-factor authentication (if implemented)

### 🧭 Navigation Tests
- Route protection
- Breadcrumb navigation
- Mobile responsiveness
- Keyboard navigation
- Deep linking

### 👥 User Management Tests
- User listing and pagination
- Search and filtering
- User creation/editing
- Role management
- Permission validation

### 📋 Inspection Tests
- Inspection CRUD operations
- Template integration
- Status workflows
- File attachments
- Data validation

### 📝 Template Tests
- Template creation
- Version management
- Question types
- Template assignment
- Usage tracking

### 🔒 Security Tests
- CSRF protection
- XSS prevention
- Input sanitization
- Rate limiting
- Authentication bypass prevention

### 🏢 Multi-Organization Tests
- Tenant isolation
- Organization switching
- Data segregation
- Admin boundaries

## Best Practices

### Writing Tests

1. **Use TestUtils**: Always use the TestUtils class for common operations
2. **Descriptive names**: Use clear, descriptive test names
3. **Independent tests**: Each test should be able to run independently
4. **Clean state**: Use beforeEach/afterEach for setup/cleanup
5. **Wait properly**: Use proper waiting strategies, avoid fixed timeouts

### Test Structure

```javascript
test.describe('Feature Name', () => {
  let utils;

  test.beforeEach(async ({ page }) => {
    utils = new TestUtils(page);
    await utils.loginAsAdmin(); // Setup if needed
  });

  test.describe('Sub-feature', () => {
    test('should do specific thing', async ({ page }) => {
      // Arrange
      await utils.navigateTo('/page');

      // Act
      await page.click('button');

      // Assert
      await expect(page.locator('.result')).toBeVisible();
    });
  });
});
```

### Debugging Tests

1. **Run in headed mode**: `--headed` to see browser
2. **Use debug mode**: `--debug` to step through tests
3. **Check screenshots**: Automatic screenshots on failure
4. **View trace**: Use `--trace=on` for detailed traces
5. **Console logs**: Check browser console for errors

### Performance Considerations

- Tests run in parallel by default
- Use `test.describe.configure({ mode: 'serial' })` for dependent tests
- Optimize selectors for speed
- Reuse authentication state when possible
- Clean up test data to prevent slowdowns

## Maintenance

### Adding New Tests

1. Create test file following naming convention: `feature-name.test.js`
2. Use TestUtils for common operations
3. Add feature-specific selectors to test-config.js
4. Update this README if needed

### Updating Selectors

1. Update selectors in `test-config.js`
2. Add new utility methods to `test-utils.js`
3. Test against all browsers if UI changes are significant

### Configuration Changes

1. Update `test-config.js` for global changes
2. Update `playwright.config.ts` for Playwright-specific settings
3. Update environment variables documentation

## Troubleshooting

### Common Issues

1. **Tests timing out**: Increase timeouts in config or use proper waits
2. **Flaky tests**: Add more specific waits, avoid race conditions
3. **Authentication failures**: Check credentials and test user setup
4. **Selector not found**: Update selectors in test-config.js
5. **API errors**: Ensure backend is running and accessible

### Debug Commands

```bash
# Run with debug output
npx playwright test --headed --slowMo=1000 auth.test.js

# Generate trace
npx playwright test --trace=on failed-test.test.js

# Run single test
npx playwright test --grep "should login successfully"

# Show test report
npx playwright show-report
```

## CI/CD Integration

The test suite is optimized for CI environments:

- Automatic browser selection (Chromium only in CI)
- Reduced parallel workers for stability
- JSON and JUnit reporting
- Artifact collection
- Global setup/teardown for environment verification

### GitHub Actions Example

```yaml
- name: Run E2E tests
  run: |
    npm ci
    npx playwright install
    npm run test:e2e
  env:
    CI: true
    NODE_ENV: test
```

## Test Results

Test results are automatically generated in multiple formats:

- **HTML Report**: `test-results/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit XML**: `test-results/junit.xml`
- **Screenshots**: `test-results/screenshots/`
- **Videos**: `test-results/videos/`

---

## Recent Cleanup Summary

This test suite was recently cleaned up with the following improvements:

### ✅ Completed Tasks

1. **Analyzed 39 existing test files** and identified redundancies
2. **Removed 19 debug/temporary files** including:
   - `debug-login.test.js`
   - `simple-login-test.test.js`
   - `john-login-debug.test.js`
   - Multiple duplicate template tests
   - Various debug and fix verification files

3. **Consolidated similar tests** and improved structure
4. **Standardized naming conventions** (kebab-case for consistency)
5. **Created comprehensive test utilities** (`test-utils.js`)
6. **Implemented proper setup/teardown** with global configuration
7. **Enhanced Playwright configuration** for better reliability

### 🎯 Result

- **Reduced from 39 to 20 focused test files**
- **Eliminated duplicate scenarios**
- **Standardized test patterns**
- **Improved reliability and maintainability**
- **Better error handling and debugging**
- **Comprehensive coverage of core UI functionality**

The test suite now provides clean, maintainable, and comprehensive coverage of the Resource Management application's UI functionality.