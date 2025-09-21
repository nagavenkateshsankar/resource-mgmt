# Security Test Suite

This directory contains comprehensive security tests for the multi-tenant resource management system.

## Overview

The security test suite validates the security fixes and multi-organization functionality implemented by the technical-lead-coder. It covers:

- JWT authentication security
- Session management
- Organization isolation
- Role-based access control
- Input validation and injection prevention
- Database integrity
- API security
- Multi-tenant functionality

## Test Structure

```
tests/
├── security_checklist.md          # Manual security validation checklist
├── database_integrity_test.go     # Database security and integrity tests
└── README.md                      # This file

frontend/tests/e2e/
├── security-validation.test.js    # Core security validation tests
├── api-penetration-tests.test.js  # API security and penetration tests
├── multi-org-integration.test.js  # Multi-organization integration tests
└── multi-tenant-isolation.test.js # Existing tenant isolation tests

pkg/utils/
└── jwt_test.go                     # JWT security unit tests

middleware/
├── session_validation_test.go     # Session management unit tests
└── secure_auth_test.go            # Authentication middleware unit tests

services/
└── organization_validator_test.go # Organization access validation tests

scripts/
└── run-security-tests.sh          # Automated test runner

test-reports/
└── security_validation_report.md  # Comprehensive security report
```

## Running Tests

### Prerequisites

1. **Environment Setup:**
   ```bash
   export JWT_SECRET="your_secure_jwt_secret_with_minimum_32_characters"
   export ENVIRONMENT="test"
   ```

2. **Services Running:**
   - Backend API: http://localhost:3007
   - Frontend: http://localhost:5174

3. **Test Users Available:**
   - `john@gmail.com` (admin role)
   - `jobh@gmail.com` (user role)

### Automated Test Execution

Run the complete security test suite:

```bash
# Full test suite
./scripts/run-security-tests.sh

# Go unit tests only
./scripts/run-security-tests.sh --go-only

# E2E tests only
./scripts/run-security-tests.sh --e2e-only

# Generate report without running tests
./scripts/run-security-tests.sh --report-only
```

### Manual Test Execution

**Go Unit Tests:**
```bash
# JWT Security Tests
go test -v ./pkg/utils -run TestJWT

# Session Validation Tests
go test -v ./middleware -run TestSession

# Secure Authentication Tests
go test -v ./middleware -run TestSecureAuth

# Organization Validator Tests
go test -v ./services -run TestOrganizationValidator

# Database Integrity Tests
go test -v ./tests -run TestDatabaseIntegrity
```

**Playwright E2E Tests:**
```bash
cd frontend

# Security validation tests
npx playwright test tests/e2e/security-validation.test.js

# API penetration tests
npx playwright test tests/e2e/api-penetration-tests.test.js

# Multi-organization integration tests
npx playwright test tests/e2e/multi-org-integration.test.js

# Multi-tenant isolation tests
npx playwright test tests/e2e/multi-tenant-isolation.test.js
```

## Test Categories

### 1. Authentication Security Tests

**Location:** `pkg/utils/jwt_test.go`, `middleware/secure_auth_test.go`

Tests cover:
- JWT secret validation and strength
- Token generation and validation
- Algorithm confusion attack prevention
- Token tampering detection
- Signature validation
- Claims validation

### 2. Session Management Tests

**Location:** `middleware/session_validation_test.go`

Tests cover:
- Session lifecycle management
- Session expiration and timeout
- Session replay attack prevention
- Session cleanup and invalidation
- Concurrent session handling
- Activity tracking

### 3. Organization Isolation Tests

**Location:** `services/organization_validator_test.go`, `tests/database_integrity_test.go`

Tests cover:
- Data isolation between organizations
- User membership validation
- Resource access control
- Database-level isolation
- Foreign key constraints
- Data consistency

### 4. API Security Tests

**Location:** `frontend/tests/e2e/api-penetration-tests.test.js`

Tests cover:
- Authentication bypass attempts
- Authorization boundary testing
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CSRF protection
- Rate limiting
- File upload security

### 5. End-to-End Security Tests

**Location:** `frontend/tests/e2e/security-validation.test.js`

Tests cover:
- Complete authentication workflows
- Role-based access control
- Organization context maintenance
- Session security
- Error handling
- Network failure resilience

### 6. Multi-Organization Integration Tests

**Location:** `frontend/tests/e2e/multi-org-integration.test.js`

Tests cover:
- Complete user workflows
- Data consistency across UI and API
- Organization switching
- Permission enforcement
- Error scenarios

## Security Checklist

Use the manual security checklist (`security_checklist.md`) for:
- Pre-deployment security validation
- Security review processes
- Compliance verification
- Production readiness assessment

## Test Reports

The test suite generates comprehensive reports in `test-reports/`:
- Security validation report
- Test execution logs
- Coverage reports
- Compliance documentation

## Security Standards

The tests validate compliance with:
- OWASP Top 10 (2023)
- JWT Security Best Practices
- Session Management Standards
- Multi-Tenancy Security Guidelines

## Contributing

When adding new security tests:

1. Follow the existing test patterns
2. Include both positive and negative test cases
3. Add comprehensive error condition testing
4. Update the security checklist if needed
5. Ensure tests are deterministic and reliable

## Troubleshooting

### Common Issues

1. **JWT Secret Errors:**
   - Ensure JWT_SECRET is set and >= 32 characters
   - Use a cryptographically secure random string

2. **Service Connection Errors:**
   - Verify backend API is running on port 3007
   - Verify frontend is running on port 5174
   - Check network connectivity

3. **Database Test Failures:**
   - Ensure test database is clean
   - Check foreign key constraints
   - Verify test data setup

4. **Playwright Test Issues:**
   - Ensure browsers are installed: `npx playwright install`
   - Check for port conflicts
   - Verify test user credentials

### Debug Mode

Run tests with additional logging:

```bash
# Go tests with verbose output
go test -v -race ./...

# Playwright tests with debug info
DEBUG=pw:* npx playwright test

# Script with debug output
DEBUG=1 ./scripts/run-security-tests.sh
```

## Security Contact

For security-related questions or issues:
- Review the security validation report
- Check the security checklist
- Consult the test implementations
- Contact the development team

---

**Note:** These tests validate the security fixes implemented by the technical-lead-coder. All tests should pass before production deployment.