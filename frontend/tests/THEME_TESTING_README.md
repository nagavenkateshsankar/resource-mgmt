# Theme System Testing Guide

This guide covers comprehensive testing for the light/dark theme system implemented in the Vue.js 3 resource management application.

## Overview

The theme testing suite ensures that the light and dark theme implementation is robust, accessible, performant, and visually consistent across all application components.

## Test Architecture

### 1. Unit Tests (`/tests/unit/`)
- **theme-store.test.js**: Tests the Pinia theme store functionality
- **theme-composable.test.js**: Tests the `useTheme` composable
- **theme-toggle.test.js**: Tests the ThemeToggle component

### 2. E2E Tests (`/tests/e2e/`)
- **theme-functionality.test.js**: End-to-end theme workflow tests
- **theme-accessibility.test.js**: WCAG compliance and accessibility tests
- **theme-visual-regression.test.js**: Visual consistency testing
- **theme-performance.test.js**: Performance and memory usage tests

## Test Coverage

### Theme Store Testing
- ✅ Initial state and default values
- ✅ System preference detection
- ✅ Theme persistence (localStorage)
- ✅ Theme setting and toggling
- ✅ Theme application (CSS classes and custom properties)
- ✅ Error handling and edge cases
- ✅ Event dispatching and cleanup
- ✅ CSS variables generation

### Theme Composable Testing
- ✅ Reactive properties exposure
- ✅ Theme action proxying
- ✅ Tailwind CSS class helpers
- ✅ Color value utilities
- ✅ Theme transition helpers
- ✅ Event listener management
- ✅ Media query detection
- ✅ Accessibility helpers (contrast ratios)

### ThemeToggle Component Testing
- ✅ Compact variant functionality
- ✅ Dropdown variant with menu navigation
- ✅ Switch variant for binary toggling
- ✅ Icon display for different themes
- ✅ Accessibility attributes (ARIA, labels)
- ✅ Keyboard navigation support
- ✅ Event emission and props handling
- ✅ Focus management and cleanup

### E2E Functionality Testing
- ✅ Theme initialization and system detection
- ✅ Theme persistence across reloads
- ✅ Theme application to DOM elements
- ✅ System theme change response
- ✅ Component integration testing
- ✅ Cross-tab synchronization
- ✅ Error handling scenarios
- ✅ Performance benchmarks

### Accessibility Testing
- ✅ WCAG AA/AAA color contrast compliance
- ✅ Screen reader compatibility
- ✅ Keyboard navigation support
- ✅ Focus management and indicators
- ✅ High contrast mode support
- ✅ Reduced motion preference respect
- ✅ Proper ARIA attributes and roles
- ✅ Meaningful labels and descriptions

### Visual Regression Testing
- ✅ Full page screenshots (light/dark)
- ✅ Component-level screenshots
- ✅ Interactive state screenshots (hover, focus)
- ✅ Responsive layout testing
- ✅ Theme transition captures
- ✅ Error state styling
- ✅ Loading state consistency

### Performance Testing
- ✅ Theme switching speed
- ✅ Memory leak detection
- ✅ Rendering performance
- ✅ CSS custom property efficiency
- ✅ Network request monitoring
- ✅ Storage operation performance
- ✅ Bundle size impact assessment

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

### Running All Theme Tests

Execute the comprehensive test suite:
```bash
./scripts/run-theme-tests.sh
```

This script will:
- Run unit tests with coverage
- Start the development server
- Execute all E2E test suites
- Generate a comprehensive HTML report
- Provide pass/fail summary

### Running Individual Test Suites

#### Unit Tests Only
```bash
npm run test:unit -- tests/unit/theme-*.test.js --coverage
```

#### E2E Tests Only
```bash
npm run dev & # Start dev server first
npx playwright test tests/e2e/theme-*.test.js
```

#### Specific Test Categories
```bash
# Functionality tests
npx playwright test tests/e2e/theme-functionality.test.js

# Accessibility tests
npx playwright test tests/e2e/theme-accessibility.test.js

# Visual regression tests
npx playwright test tests/e2e/theme-visual-regression.test.js

# Performance tests
npx playwright test tests/e2e/theme-performance.test.js
```

### Running Tests in Different Browsers

```bash
# Chrome (default)
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# Safari
npx playwright test --project=webkit

# All browsers
npx playwright test --project=chromium --project=firefox --project=webkit
```

## Test Configuration

### Environment Variables

The tests support several environment variables for customization:

```bash
# Theme test mode
THEME_TEST_MODE=true

# Disable animations for consistent testing
DISABLE_ANIMATIONS=true

# Default theme for tests
DEFAULT_THEME=light

# Enable visual regression testing
ENABLE_VISUAL_REGRESSION=true

# Theme switching timeout
THEME_SWITCH_TIMEOUT=1000

# Theme transition timeout
THEME_TRANSITION_TIMEOUT=500
```

### Playwright Configuration

The E2E tests are configured in `playwright.config.ts` with:
- Multiple browser support (Chromium, Firefox, WebKit)
- Mobile device testing
- Screenshot and video capture on failure
- Trace collection for debugging

### Vitest Configuration

Unit tests use `vitest.config.js` with:
- Vue.js support
- JSDOM environment
- Coverage reporting
- Test setup files

## Test Data and Mocks

### Unit Test Mocks
- DOM APIs (localStorage, matchMedia, ResizeObserver)
- Vue Router and navigation
- Heroicons components
- Performance APIs

### E2E Test Setup
- Clean browser state for each test
- Consistent viewport sizes
- Disabled animations for reliability
- Mock system preferences when needed

## Coverage Requirements

The theme system maintains high test coverage standards:

- **Statements**: ≥90%
- **Branches**: ≥90%
- **Functions**: ≥90%
- **Lines**: ≥90%

Coverage reports are generated in:
- `test-results/coverage/` (HTML report)
- `test-results/unit-results.json` (JSON data)

## Visual Regression Testing

### Screenshot Management

Visual regression tests capture screenshots for:
- Full page views in both themes
- Individual components in both themes
- Interactive states (hover, focus, active)
- Responsive layouts (mobile, tablet, desktop)
- Error and loading states

Screenshots are stored in `test-results/screenshots/` and compared against baseline images.

### Updating Baselines

When UI changes are intentional, update screenshot baselines:
```bash
npx playwright test tests/e2e/theme-visual-regression.test.js --update-snapshots
```

## Performance Benchmarks

### Theme Switching Performance
- **Average switching time**: <50ms
- **Maximum switching time**: <100ms
- **Memory increase per 100 switches**: <50%

### Rendering Performance
- **Frame rate during transitions**: >30fps average, >15fps minimum
- **Render time per component**: <1ms
- **CSS property operations**: <100ms for 1000 operations

### Network Impact
- **Additional requests during theme changes**: 0
- **Bundle size increase**: <5KB gzipped

## Accessibility Standards

### WCAG Compliance

The theme system meets WCAG 2.1 standards:

#### Level AA Requirements
- **Color contrast**: ≥4.5:1 for normal text, ≥3:1 for large text
- **Keyboard navigation**: All theme controls accessible via keyboard
- **Screen reader support**: Proper ARIA labels and announcements

#### Level AAA Requirements
- **Enhanced contrast**: ≥7:1 for normal text, ≥4.5:1 for large text
- **Motion reduction**: Respects `prefers-reduced-motion`
- **High contrast**: Works with forced-colors mode

### Testing Tools

Accessibility tests use:
- **axe-core**: Automated accessibility testing
- **Playwright accessibility features**: Built-in a11y assertions
- **Manual testing guidelines**: Keyboard and screen reader testing

## Troubleshooting

### Common Issues

#### Test Failures

1. **Visual regression failures**:
   - Check if UI changes are intentional
   - Update baselines if needed
   - Ensure consistent testing environment

2. **Performance test failures**:
   - Check system load during testing
   - Verify browser performance settings
   - Consider CI environment differences

3. **Accessibility failures**:
   - Review color contrast ratios
   - Check ARIA attributes
   - Verify keyboard navigation

#### Setup Issues

1. **Development server not starting**:
   - Check port 5173 availability
   - Verify Node.js version compatibility
   - Review console errors

2. **Playwright browser issues**:
   - Reinstall browsers: `npx playwright install`
   - Check system dependencies
   - Update Playwright version

### Debug Mode

Run tests with additional debugging:

```bash
# Debug mode for E2E tests
npx playwright test --debug tests/e2e/theme-functionality.test.js

# Headed mode (visible browser)
npx playwright test --headed tests/e2e/theme-visual-regression.test.js

# Trace viewer for failed tests
npx playwright show-trace test-results/trace.zip
```

## Continuous Integration

### CI Configuration

For GitHub Actions or similar CI systems:

```yaml
- name: Run theme tests
  run: |
    npm install
    npx playwright install
    ./scripts/run-theme-tests.sh

- name: Upload test results
  uses: actions/upload-artifact@v3
  if: always()
  with:
    name: theme-test-results
    path: test-results/
```

### Pre-commit Hooks

Add theme tests to pre-commit hooks:

```json
{
  "pre-commit": [
    "npm run test:unit -- tests/unit/theme-*.test.js",
    "npm run lint"
  ]
}
```

## Contributing

### Adding New Theme Tests

1. **Unit tests**: Add to appropriate test file or create new file in `tests/unit/`
2. **E2E tests**: Add to relevant E2E test file or create new test file
3. **Follow naming conventions**: `theme-[category].test.js`
4. **Update this README**: Document new test coverage

### Test Writing Guidelines

1. **Use descriptive test names**: Clearly state what is being tested
2. **Group related tests**: Use `describe` blocks for organization
3. **Clean up after tests**: Restore state in `afterEach` hooks
4. **Use appropriate assertions**: Choose specific, meaningful assertions
5. **Mock external dependencies**: Keep tests isolated and reliable

### Code Coverage

Maintain high coverage by:
- Testing both success and error paths
- Covering edge cases and boundary conditions
- Testing all component variants and props
- Verifying accessibility features
- Testing performance characteristics

## Resources

### Documentation
- [Vue.js Testing Guide](https://vuejs.org/guide/scaling-up/testing.html)
- [Playwright Documentation](https://playwright.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Tools
- [axe DevTools](https://www.deque.com/axe/devtools/)
- [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
- [Vue DevTools](https://devtools.vuejs.org/)

This comprehensive testing suite ensures that the theme system provides a robust, accessible, and performant user experience across all supported browsers and devices.