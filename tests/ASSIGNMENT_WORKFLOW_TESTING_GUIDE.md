# Assignment Workflow Testing Guide

## Overview

This document provides comprehensive testing guidance for the Assignment Workflow system. The testing suite ensures that the new assignment features work correctly, maintain security standards, perform efficiently, and don't break existing functionality.

## Test Architecture

### Test Categories

1. **API Integration Tests** (`assignment_workflow_api_test.go`)
   - Tests all workflow API endpoints
   - Validates request/response handling
   - Checks authentication and authorization
   - Performance benchmarking

2. **End-to-End Workflow Tests** (`assignment-workflow-e2e.test.js`)
   - Complete user journey testing
   - Site-first and inspection-first workflows
   - Assignment management operations
   - Cross-browser compatibility

3. **UI/UX Validation Tests** (`assignment-ui-ux-validation.test.js`)
   - Visual design consistency
   - Accessibility compliance (WCAG)
   - User experience validation
   - Form interaction testing

4. **Regression Tests** (`assignment-regression.test.js`)
   - Ensures existing functionality remains intact
   - Template and site management integration
   - User authentication and navigation
   - Data persistence validation

5. **Security & Permissions Tests** (`assignment-security-permissions.test.js`)
   - Authentication security
   - Role-based access control
   - Input validation and sanitization
   - Organization-level isolation

6. **Performance Tests** (`assignment-performance.test.js`)
   - Page load performance
   - API response times
   - Memory usage optimization
   - Mobile performance validation

## Test Environment Setup

### Prerequisites

1. **Backend Server**
   ```bash
   # Start the Go backend server
   cd /path/to/resource-mgmt
   go run main.go
   # Or if using Docker
   docker-compose up backend
   ```

2. **Frontend Server**
   ```bash
   # Start the Vue.js frontend
   cd frontend
   npm install
   npm run dev
   ```

3. **Database**
   - Ensure PostgreSQL is running
   - Apply latest migrations
   - Seed test data if needed

### Test Data Requirements

The tests require the following test data:

- **Organizations**: At least one test organization
- **Users**: Users with different roles (admin, supervisor, inspector, viewer)
- **Sites**: Multiple test sites for assignment testing
- **Templates**: Various inspection templates
- **Existing Inspections**: Some sample inspections for regression testing

## Running Tests

### Quick Start

Execute the complete test suite:

```bash
# Run all assignment workflow tests
./scripts/run-assignment-workflow-tests.sh
```

### Individual Test Categories

#### API Integration Tests
```bash
cd /path/to/resource-mgmt
go test -v ./tests/assignment_workflow_api_test.go
```

#### End-to-End Tests
```bash
cd frontend
npx playwright test tests/e2e/assignment-workflow-e2e.test.js
```

#### UI/UX Validation
```bash
cd frontend
npx playwright test tests/e2e/assignment-ui-ux-validation.test.js
```

#### Regression Tests
```bash
cd frontend
npx playwright test tests/e2e/assignment-regression.test.js
```

#### Security Tests
```bash
cd frontend
npx playwright test tests/e2e/assignment-security-permissions.test.js
```

#### Performance Tests
```bash
cd frontend
npx playwright test tests/e2e/assignment-performance.test.js
```

### Advanced Test Execution

#### Running Tests in Different Browsers
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

#### Mobile Testing
```bash
# Enable mobile tests
MOBILE_TESTS=true npx playwright test tests/e2e/assignment-*.test.js
```

#### Headed Mode for Debugging
```bash
npx playwright test --headed tests/e2e/assignment-workflow-e2e.test.js
```

#### Debug Mode
```bash
npx playwright test --debug tests/e2e/assignment-workflow-e2e.test.js
```

## Test Scenarios

### Critical Path Testing

1. **Assignment Creation Workflow**
   - User navigates to bulk assignment page
   - Fills assignment details (name, description, priority)
   - Selects template and sites
   - Assigns inspectors (manual, auto, or equal distribution)
   - Sets assignment options and submits
   - Verifies assignment creation and notifications

2. **Assignment Management**
   - Inspector accepts/rejects assignments
   - Admin reassigns inspections
   - Progress tracking and status updates
   - Assignment completion workflow

3. **Permission Validation**
   - Role-based access control
   - Organization isolation
   - Feature availability by user role

### Edge Cases

1. **Large Data Sets**
   - Bulk assignment with 50+ sites
   - Performance with 100+ assignments
   - Memory usage with large datasets

2. **Error Scenarios**
   - Network failures during assignment creation
   - Invalid input validation
   - Server errors and recovery

3. **Concurrent Operations**
   - Multiple users creating assignments
   - Simultaneous inspector assignments
   - Race condition handling

## Test Data Management

### Test User Accounts

```javascript
const testUsers = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    role: 'admin'
  },
  supervisor: {
    email: 'supervisor@test.com',
    password: 'supervisor123',
    role: 'supervisor'
  },
  inspector: {
    email: 'john@example.com',
    password: 'password123',
    role: 'inspector'
  },
  viewer: {
    email: 'viewer@test.com',
    password: 'viewer123',
    role: 'viewer'
  }
};
```

### Test Organizations

- Primary test organization with full feature access
- Secondary organization for isolation testing
- Organization with limited features for edge case testing

### Test Sites and Templates

- Various site types (commercial, residential, industrial)
- Multiple templates with different field configurations
- Sites in different geographical locations

## Security Testing

### Authentication Tests

1. **Session Management**
   - Login/logout functionality
   - Session expiration handling
   - Token validation

2. **Authorization**
   - Role-based access control
   - Feature permissions
   - Resource access restrictions

### Input Security Tests

1. **XSS Prevention**
   - Script injection in form fields
   - HTML tag sanitization
   - Event handler injection

2. **SQL Injection Prevention**
   - Search field validation
   - Filter parameter sanitization
   - API parameter validation

3. **File Upload Security**
   - File type validation
   - Size restrictions
   - Malicious file detection

### API Security Tests

1. **Authentication Required**
   - All protected endpoints require authentication
   - Invalid token handling
   - Token expiration

2. **Authorization Checks**
   - User can only access their organization's data
   - Role-based endpoint access
   - Resource ownership validation

## Performance Testing

### Load Performance Metrics

1. **Page Load Times**
   - Initial page load < 3 seconds
   - Interactive time < 2 seconds
   - First contentful paint < 1 second

2. **API Response Times**
   - Simple queries < 500ms
   - Complex operations < 2 seconds
   - Bulk operations < 10 seconds

3. **Resource Usage**
   - Memory usage growth < 200%
   - DOM node count reasonable
   - Event listener cleanup

### Performance Benchmarks

| Operation | Target Time | Maximum Time |
|-----------|-------------|--------------|
| Assignment page load | 2s | 3s |
| Site selection (50 sites) | 100ms | 300ms |
| Bulk assignment creation | 5s | 10s |
| Assignment list filtering | 200ms | 500ms |
| API response (simple) | 200ms | 500ms |
| API response (complex) | 1s | 2s |

## Accessibility Testing

### WCAG 2.1 Compliance

1. **Level A Requirements**
   - Alt text for images
   - Keyboard navigation
   - Proper heading structure

2. **Level AA Requirements**
   - Color contrast ratios
   - Focus indicators
   - Resize text to 200%

3. **Screen Reader Support**
   - Semantic HTML structure
   - ARIA labels and roles
   - Form field associations

### Keyboard Navigation

- Tab order logical and complete
- All interactive elements reachable
- Escape key closes modals
- Enter key activates buttons

## Reporting and Analysis

### Test Report Contents

1. **Executive Summary**
   - Overall test results
   - Critical issues identified
   - Production readiness assessment

2. **Detailed Results**
   - Test category breakdown
   - Pass/fail rates
   - Performance metrics

3. **Security Findings**
   - Vulnerability assessment
   - Authentication validation
   - Input security results

4. **Performance Analysis**
   - Load time measurements
   - Resource usage analysis
   - Optimization recommendations

### Continuous Integration

Integration with CI/CD pipeline:

```yaml
# Example GitHub Actions workflow
name: Assignment Workflow Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Setup Node.js
        uses: actions/setup-node@v2
        with:
          node-version: '16'
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      - name: Run Playwright tests
        run: |
          cd frontend
          npx playwright test tests/e2e/assignment-*.test.js
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results/
```

## Troubleshooting

### Common Issues

1. **Server Not Running**
   ```
   Error: connect ECONNREFUSED localhost:5173
   Solution: Start frontend dev server with `npm run dev`
   ```

2. **Database Connection**
   ```
   Error: Database connection failed
   Solution: Ensure PostgreSQL is running and migrations are applied
   ```

3. **Authentication Failures**
   ```
   Error: User not found
   Solution: Ensure test users exist in database or seed test data
   ```

4. **Timeout Errors**
   ```
   Error: Test timeout
   Solution: Increase timeout values or check server performance
   ```

### Debug Mode

For detailed debugging:

```bash
# Enable debug logging
DEBUG=1 npx playwright test --headed tests/e2e/assignment-workflow-e2e.test.js

# Capture screenshots on failure
npx playwright test --screenshot=only-on-failure

# Record video of test execution
npx playwright test --video=on-first-retry
```

## Maintenance

### Regular Test Updates

1. **Monthly Reviews**
   - Update test data
   - Review performance benchmarks
   - Check for new security vulnerabilities

2. **Feature Updates**
   - Add tests for new assignment features
   - Update regression tests
   - Modify security tests for new endpoints

3. **Environment Updates**
   - Update browser versions
   - Refresh test dependencies
   - Review CI/CD pipeline performance

### Test Data Cleanup

```bash
# Clean up test artifacts
rm -rf test-results/
rm -rf test-reports/assignment-workflow/*

# Reset test database
npm run db:reset:test
```

## Best Practices

### Writing Tests

1. **Test Structure**
   - Use descriptive test names
   - Group related tests in describe blocks
   - Follow AAA pattern (Arrange, Act, Assert)

2. **Test Data**
   - Use unique test data per test
   - Clean up after tests
   - Avoid dependencies between tests

3. **Assertions**
   - Use specific assertions
   - Include meaningful error messages
   - Test both positive and negative cases

### Performance Optimization

1. **Test Execution**
   - Run tests in parallel when possible
   - Use test filtering for development
   - Cache dependencies and setup

2. **Resource Management**
   - Close browser contexts after tests
   - Clean up test data
   - Monitor memory usage

## Support and Documentation

### Resources

- [Playwright Documentation](https://playwright.dev/)
- [Vue.js Testing Guide](https://vuejs.org/guide/scaling-up/testing.html)
- [Go Testing Package](https://golang.org/pkg/testing/)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Contact

For questions about assignment workflow testing:
- Technical Lead: [Insert contact information]
- QA Team: [Insert contact information]
- DevOps: [Insert contact information]

---

*This guide is maintained as part of the Assignment Workflow system documentation.*