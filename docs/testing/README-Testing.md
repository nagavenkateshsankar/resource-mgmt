# 🧪 Site Inspection Manager - Testing Guide

## Overview
Comprehensive testing suite for the Site Inspection Manager PWA using Playwright, Lighthouse, and additional tools.

## 🚀 Quick Start

### Install Dependencies
```bash
npm run install:deps
```

### Run All Tests
```bash
npm test
```

## 📊 Test Categories

### 🔥 Smoke Tests (`@smoke`)
Critical functionality that must work:
```bash
npm run test:smoke
```
- User authentication
- Basic navigation
- Template selection modal
- Inspection creation

### 🔄 Regression Tests (`@regression`) 
Full feature testing:
```bash
npm run test:regression
```
- Complete inspection workflow
- Template management
- Dashboard functionality
- Data persistence

### 📱 Mobile/PWA Tests (`@pwa`, `@mobile`)
PWA-specific functionality:
```bash
npm run test:mobile
npm run test:pwa
```
- Offline functionality
- Service worker registration
- Mobile navigation
- Install prompts

### ⚡ Performance Tests (`@performance`)
```bash
npm run test:lighthouse
```
- Page load times
- Lighthouse scores
- Accessibility compliance

## 🎯 Test Execution Options

### Visual Testing
```bash
npm run test:headed    # See browser
npm run test:ui        # Interactive mode
npm run test:debug     # Step-by-step debugging
```

### Specific Test Suites
```bash
npm run test:auth        # Authentication tests
npm run test:modal       # Modal system tests
npm run test:inspection  # Inspection workflow
npm run test:templates   # Template management
```

### Cross-Browser Testing
```bash
npm test                 # All browsers
npm test -- --project=chromium
npm test -- --project=firefox
npm test -- --project=webkit
```

## 📱 PWA Testing Features

### Offline Testing
- Tests app functionality without network
- Verifies offline indicators
- Tests data sync when online

### Mobile Responsiveness
- Tests on mobile viewports
- Verifies touch interactions
- Tests mobile navigation patterns

### Performance Monitoring
- Lighthouse CI integration
- Performance budgets
- PWA compliance checks

## 🔧 Test Structure

```
tests/
├── auth.test.js           # Authentication & login
├── inspection.test.js     # Inspection workflows  
├── templates.test.js      # Template management
├── modal.test.js          # Modal system debugging
├── pwa.test.js           # PWA functionality
└── ...
```

## 📈 Test Reports

### View Latest Results
```bash
npm run test:report
```

### Lighthouse Reports
```bash
npm run test:lighthouse
```

## 🐛 Debugging Tests

### Debug Specific Test
```bash
npx playwright test tests/modal.test.js --debug
```

### Generate Screenshots
- Screenshots automatically taken on failures
- Videos recorded for failed tests
- Traces available for debugging

### Console Logs
```bash
npm test -- --reporter=list
```

## 🔄 Continuous Integration

### GitHub Actions (Example)
```yaml
- name: Install dependencies
  run: npm run install:deps

- name: Run tests
  run: npm test

- name: Run Lighthouse CI
  run: npm run test:lighthouse
```

## 📊 Test Coverage

The test suite covers:
- ✅ User authentication flows
- ✅ Template selection and creation
- ✅ Inspection workflows (create, edit, submit)
- ✅ Modal system functionality
- ✅ Mobile responsiveness
- ✅ PWA features (offline, install)
- ✅ Performance benchmarks
- ✅ Accessibility compliance

## 🎯 Test Tags

Use tags to run specific test categories:
- `@smoke` - Critical functionality
- `@regression` - Full feature testing
- `@pwa` - PWA-specific features
- `@mobile` - Mobile-specific testing
- `@performance` - Performance & accessibility
- `@ui` - User interface testing

## 🚨 Troubleshooting

### Tests Not Running?
1. Ensure Go server is running: `go run main.go`
2. Check port 5432 is available
3. Install Playwright browsers: `npx playwright install`

### Modal Not Visible?
1. Run the standalone test: `http://localhost:5432/test-modal.html`
2. Check browser console for errors
3. Run modal-specific test: `npm run test:modal`

### PWA Features Not Working?
1. Ensure HTTPS in production
2. Check service worker registration
3. Validate manifest.json

## 📝 Adding New Tests

### Create New Test File
```javascript
const { test, expect } = require('@playwright/test');

test.describe('Feature Name @category', () => {
  test.beforeEach(async ({ page }) => {
    // Setup code
  });

  test('should do something', async ({ page }) => {
    // Test implementation
  });
});
```

### Best Practices
- Use descriptive test names
- Add appropriate tags (@smoke, @regression)
- Mock external dependencies
- Take screenshots on failures
- Use page object pattern for complex workflows

## 🎉 Success Metrics

A successful test run should show:
- ✅ All smoke tests pass
- ✅ Lighthouse PWA score > 80
- ✅ Accessibility score > 90
- ✅ Performance score > 70
- ✅ No critical console errors