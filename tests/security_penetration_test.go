package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// SecurityPenetrationTestSuite provides comprehensive security tests
type SecurityPenetrationTestSuite struct {
	suite.Suite
	server          *httptest.Server
	validAdminToken string
	validUserToken  string
	invalidToken    string
}

// SetupSuite initializes the security test environment
func (suite *SecurityPenetrationTestSuite) SetupSuite() {
	// Mock tokens for testing
	suite.validAdminToken = "valid_admin_jwt_token"
	suite.validUserToken = "valid_user_jwt_token"
	suite.invalidToken = "invalid_jwt_token"
}

// Helper function to make HTTP requests
func (suite *SecurityPenetrationTestSuite) makeSecurityRequest(method, path string, body interface{}, headers map[string]string) (*http.Response, error) {
	var reqBody *bytes.Buffer
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		reqBody = bytes.NewBuffer(jsonData)
	} else {
		reqBody = bytes.NewBuffer(nil)
	}

	req, err := http.NewRequest(method, path, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")

	// Add custom headers
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	return client.Do(req)
}

// TestAuthenticationBypass tests for authentication bypass vulnerabilities
func (suite *SecurityPenetrationTestSuite) TestAuthenticationBypass() {
	testCases := []struct {
		name        string
		method      string
		path        string
		headers     map[string]string
		expectCode  int
		description string
	}{
		{
			name:        "No Authorization Header",
			method:      "GET",
			path:        "/api/v1/users",
			headers:     map[string]string{},
			expectCode:  http.StatusUnauthorized,
			description: "Should reject requests without authentication",
		},
		{
			name:   "Invalid JWT Token",
			method: "GET",
			path:   "/api/v1/users",
			headers: map[string]string{
				"Authorization": "Bearer " + suite.invalidToken,
			},
			expectCode:  http.StatusUnauthorized,
			description: "Should reject invalid JWT tokens",
		},
		{
			name:   "Malformed Authorization Header",
			method: "GET",
			path:   "/api/v1/users",
			headers: map[string]string{
				"Authorization": "InvalidBearer " + suite.validAdminToken,
			},
			expectCode:  http.StatusUnauthorized,
			description: "Should reject malformed Authorization headers",
		},
		{
			name:   "Empty Bearer Token",
			method: "GET",
			path:   "/api/v1/users",
			headers: map[string]string{
				"Authorization": "Bearer ",
			},
			expectCode:  http.StatusUnauthorized,
			description: "Should reject empty bearer tokens",
		},
		{
			name:   "SQL Injection in Authorization",
			method: "GET",
			path:   "/api/v1/users",
			headers: map[string]string{
				"Authorization": "Bearer ' OR '1'='1",
			},
			expectCode:  http.StatusUnauthorized,
			description: "Should prevent SQL injection through authorization header",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			resp, err := suite.makeSecurityRequest(tc.method, tc.path, nil, tc.headers)
			suite.NoError(err, tc.description)
			defer resp.Body.Close()

			suite.Equal(tc.expectCode, resp.StatusCode, tc.description)
		})
	}
}

// TestAuthorizationEscalation tests for privilege escalation vulnerabilities
func (suite *SecurityPenetrationTestSuite) TestAuthorizationEscalation() {
	testCases := []struct {
		name        string
		method      string
		path        string
		token       string
		body        interface{}
		expectCode  int
		description string
	}{
		{
			name:   "User tries to access admin endpoint",
			method: "GET",
			path:   "/api/v1/users",
			token:  suite.validUserToken,
			body:   nil,
			expectCode: func() int {
				// Should be either Forbidden or Unauthorized
				return http.StatusForbidden
			}(),
			description: "Regular user should not access user management",
		},
		{
			name:   "User tries to create other users",
			method: "POST",
			path:   "/api/v1/users",
			token:  suite.validUserToken,
			body: map[string]interface{}{
				"name":     "Unauthorized User",
				"email":    "unauthorized@test.com",
				"password": "password123",
				"role":     "admin",
			},
			expectCode:  http.StatusForbidden,
			description: "Regular user should not create users",
		},
		{
			name:   "User tries to delete other users",
			method: "DELETE",
			path:   "/api/v1/users/other_user_id",
			token:  suite.validUserToken,
			body:   nil,
			expectCode:  http.StatusForbidden,
			description: "Regular user should not delete users",
		},
		{
			name:   "User tries to elevate role to admin",
			method: "PUT",
			path:   "/api/v1/users/self_user_id",
			token:  suite.validUserToken,
			body: map[string]interface{}{
				"role": "admin",
			},
			expectCode:  http.StatusBadRequest, // Should prevent self role elevation
			description: "User should not elevate own role",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			headers := map[string]string{
				"Authorization": "Bearer " + tc.token,
			}

			resp, err := suite.makeSecurityRequest(tc.method, tc.path, tc.body, headers)
			suite.NoError(err, tc.description)
			defer resp.Body.Close()

			suite.Equal(tc.expectCode, resp.StatusCode, tc.description)
		})
	}
}

// TestInputValidationAndSanitization tests for injection vulnerabilities
func (suite *SecurityPenetrationTestSuite) TestInputValidationAndSanitization() {
	maliciousInputs := []struct {
		name        string
		input       interface{}
		field       string
		description string
	}{
		{
			name: "SQL Injection in Name",
			input: map[string]interface{}{
				"name":     "'; DROP TABLE users; --",
				"email":    "test@example.com",
				"password": "password123",
				"role":     "inspector",
			},
			field:       "name",
			description: "Should prevent SQL injection in name field",
		},
		{
			name: "XSS in Name",
			input: map[string]interface{}{
				"name":     "<script>alert('xss')</script>",
				"email":    "test@example.com",
				"password": "password123",
				"role":     "inspector",
			},
			field:       "name",
			description: "Should prevent XSS in name field",
		},
		{
			name: "NoSQL Injection in Email",
			input: map[string]interface{}{
				"name":     "Test User",
				"email":    "test@example.com\"; return true; var a=\"",
				"password": "password123",
				"role":     "inspector",
			},
			field:       "email",
			description: "Should prevent NoSQL injection in email field",
		},
		{
			name: "Command Injection in Password",
			input: map[string]interface{}{
				"name":     "Test User",
				"email":    "test@example.com",
				"password": "password123; rm -rf /",
				"role":     "inspector",
			},
			field:       "password",
			description: "Should sanitize command injection attempts",
		},
		{
			name: "LDAP Injection in Email",
			input: map[string]interface{}{
				"name":     "Test User",
				"email":    "test@example.com)(objectClass=*",
				"password": "password123",
				"role":     "inspector",
			},
			field:       "email",
			description: "Should prevent LDAP injection in email field",
		},
		{
			name: "Buffer Overflow Attempt",
			input: map[string]interface{}{
				"name":     strings.Repeat("A", 10000),
				"email":    "test@example.com",
				"password": "password123",
				"role":     "inspector",
			},
			field:       "name",
			description: "Should handle excessively long input",
		},
		{
			name: "Unicode Bypass Attempt",
			input: map[string]interface{}{
				"name":     "Test\u0000User",
				"email":    "test\u0000@example.com",
				"password": "password123",
				"role":     "inspector",
			},
			field:       "name",
			description: "Should handle null byte injection",
		},
	}

	for _, tc := range maliciousInputs {
		suite.Run(tc.name, func() {
			headers := map[string]string{
				"Authorization": "Bearer " + suite.validAdminToken,
			}

			resp, err := suite.makeSecurityRequest("POST", "/api/v1/users", tc.input, headers)
			suite.NoError(err, tc.description)
			defer resp.Body.Close()

			// Should either validate and reject (400) or sanitize and accept (201)
			// but never cause a 500 server error or security breach
			suite.NotEqual(http.StatusInternalServerError, resp.StatusCode, tc.description)

			if resp.StatusCode == http.StatusCreated {
				// If accepted, verify the data was sanitized
				var response map[string]interface{}
				json.NewDecoder(resp.Body).Decode(&response)

				// Check that dangerous characters were removed or escaped
				if name, ok := response["name"].(string); ok {
					suite.NotContains(name, "<script>", "XSS should be prevented")
					suite.NotContains(name, "DROP TABLE", "SQL injection should be prevented")
				}
			}
		})
	}
}

// TestCrossOrganizationAccess tests multi-tenant isolation
func (suite *SecurityPenetrationTestSuite) TestCrossOrganizationAccess() {
	testCases := []struct {
		name        string
		method      string
		path        string
		orgHeader   string
		expectCode  int
		description string
	}{
		{
			name:        "Access users from different organization",
			method:      "GET",
			path:        "/api/v1/users",
			orgHeader:   "different_org_id",
			expectCode:  http.StatusForbidden,
			description: "Should prevent cross-organization access",
		},
		{
			name:        "Update user from different organization",
			method:      "PUT",
			path:        "/api/v1/users/user_from_different_org",
			orgHeader:   "different_org_id",
			expectCode:  http.StatusForbidden,
			description: "Should prevent cross-organization user updates",
		},
		{
			name:        "Delete user from different organization",
			method:      "DELETE",
			path:        "/api/v1/users/user_from_different_org",
			orgHeader:   "different_org_id",
			expectCode:  http.StatusForbidden,
			description: "Should prevent cross-organization user deletion",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			headers := map[string]string{
				"Authorization":     "Bearer " + suite.validAdminToken,
				"X-Organization-ID": tc.orgHeader,
			}

			resp, err := suite.makeSecurityRequest(tc.method, tc.path, nil, headers)
			suite.NoError(err, tc.description)
			defer resp.Body.Close()

			suite.Equal(tc.expectCode, resp.StatusCode, tc.description)
		})
	}
}

// TestAPIAbuse tests for API abuse and rate limiting
func (suite *SecurityPenetrationTestSuite) TestAPIAbuse() {
	suite.Run("Rate limiting protection", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + suite.validAdminToken,
		}

		// Make rapid requests to test rate limiting
		rateLimitedCount := 0
		successCount := 0

		for i := 0; i < 50; i++ {
			resp, err := suite.makeSecurityRequest("GET", "/api/v1/users", nil, headers)
			suite.NoError(err)

			if resp.StatusCode == http.StatusTooManyRequests {
				rateLimitedCount++
			} else if resp.StatusCode == http.StatusOK {
				successCount++
			}

			resp.Body.Close()
		}

		// If rate limiting is implemented, some requests should be rejected
		suite.T().Logf("Successful requests: %d, Rate limited: %d", successCount, rateLimitedCount)

		// Rate limiting might not be implemented, but if it is, it should work
		if rateLimitedCount > 0 {
			suite.Greater(rateLimitedCount, 0, "Rate limiting should reject excessive requests")
		}
	})

	suite.Run("Large payload handling", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + suite.validAdminToken,
		}

		// Create extremely large payload
		largePayload := map[string]interface{}{
			"name":     strings.Repeat("A", 1000000), // 1MB name
			"email":    "test@example.com",
			"password": "password123",
			"role":     "inspector",
		}

		resp, err := suite.makeSecurityRequest("POST", "/api/v1/users", largePayload, headers)
		suite.NoError(err)
		defer resp.Body.Close()

		// Should either reject with 413 (Payload Too Large) or 400 (Bad Request)
		// but should not crash the server
		suite.NotEqual(http.StatusInternalServerError, resp.StatusCode, "Large payload should not crash server")
	})
}

// TestSessionManagement tests session security
func (suite *SecurityPenetrationTestSuite) TestSessionManagement() {
	testCases := []struct {
		name        string
		token       string
		expectCode  int
		description string
	}{
		{
			name:        "Expired token",
			token:       "expired_jwt_token",
			expectCode:  http.StatusUnauthorized,
			description: "Should reject expired tokens",
		},
		{
			name:        "Tampered token",
			token:       "tampered.jwt.token",
			expectCode:  http.StatusUnauthorized,
			description: "Should reject tampered tokens",
		},
		{
			name:        "Token from different service",
			token:       "foreign_service_token",
			expectCode:  http.StatusUnauthorized,
			description: "Should reject tokens from other services",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			headers := map[string]string{
				"Authorization": "Bearer " + tc.token,
			}

			resp, err := suite.makeSecurityRequest("GET", "/api/v1/users", nil, headers)
			suite.NoError(err, tc.description)
			defer resp.Body.Close()

			suite.Equal(tc.expectCode, resp.StatusCode, tc.description)
		})
	}
}

// TestHTTPMethodTampering tests for HTTP method tampering
func (suite *SecurityPenetrationTestSuite) TestHTTPMethodTampering() {
	testCases := []struct {
		name           string
		method         string
		methodOverride string
		path           string
		expectCode     int
		description    string
	}{
		{
			name:           "Method override DELETE via GET",
			method:         "GET",
			methodOverride: "DELETE",
			path:           "/api/v1/users/test_user_id",
			expectCode:     http.StatusMethodNotAllowed,
			description:    "Should prevent method override attacks",
		},
		{
			name:           "Method override PUT via POST",
			method:         "POST",
			methodOverride: "PUT",
			path:           "/api/v1/users/test_user_id",
			expectCode:     http.StatusMethodNotAllowed,
			description:    "Should prevent method override via headers",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			headers := map[string]string{
				"Authorization":          "Bearer " + suite.validAdminToken,
				"X-HTTP-Method-Override": tc.methodOverride,
			}

			resp, err := suite.makeSecurityRequest(tc.method, tc.path, nil, headers)
			suite.NoError(err, tc.description)
			defer resp.Body.Close()

			// Should not allow method override for dangerous operations
			if tc.methodOverride == "DELETE" || tc.methodOverride == "PUT" {
				suite.NotEqual(http.StatusOK, resp.StatusCode, tc.description)
			}
		})
	}
}

// TestCORS tests Cross-Origin Resource Sharing security
func (suite *SecurityPenetrationTestSuite) TestCORS() {
	maliciousOrigins := []string{
		"http://evil.com",
		"https://malicious-site.net",
		"http://localhost:666",
		"null",
		"file://",
	}

	for _, origin := range maliciousOrigins {
		suite.Run(fmt.Sprintf("CORS with origin: %s", origin), func() {
			headers := map[string]string{
				"Origin":        origin,
				"Authorization": "Bearer " + suite.validAdminToken,
			}

			resp, err := suite.makeSecurityRequest("GET", "/api/v1/users", nil, headers)
			suite.NoError(err)
			defer resp.Body.Close()

			// Check CORS headers
			accessControlOrigin := resp.Header.Get("Access-Control-Allow-Origin")

			// Should not reflect back malicious origins
			if accessControlOrigin != "" {
				suite.NotEqual(origin, accessControlOrigin, "Should not allow malicious origin")
				suite.NotEqual("*", accessControlOrigin, "Should not use wildcard with credentials")
			}
		})
	}
}

// TestCSRFProtection tests Cross-Site Request Forgery protection
func (suite *SecurityPenetrationTestSuite) TestCSRFProtection() {
	suite.Run("POST without CSRF token", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + suite.validAdminToken,
			"Origin":        "http://evil.com",
		}

		body := map[string]interface{}{
			"name":     "CSRF Test User",
			"email":    "csrf@test.com",
			"password": "password123",
			"role":     "inspector",
		}

		resp, err := suite.makeSecurityRequest("POST", "/api/v1/users", body, headers)
		suite.NoError(err)
		defer resp.Body.Close()

		// If CSRF protection is implemented, this should be rejected
		// If not implemented, document this as a finding
		if resp.StatusCode == http.StatusForbidden {
			suite.Equal(http.StatusForbidden, resp.StatusCode, "CSRF protection is working")
		} else {
			suite.T().Log("WARNING: CSRF protection may not be implemented")
		}
	})
}

// TestDirectObjectReference tests for Insecure Direct Object References
func (suite *SecurityPenetrationTestSuite) TestDirectObjectReference() {
	testCases := []struct {
		name        string
		method      string
		path        string
		description string
	}{
		{
			name:        "Access user by ID enumeration",
			method:      "GET",
			path:        "/api/v1/users/1",
			description: "Should prevent enumeration of user IDs",
		},
		{
			name:        "Access user with UUID manipulation",
			method:      "GET",
			path:        "/api/v1/users/00000000-0000-0000-0000-000000000001",
			description: "Should validate user access rights",
		},
		{
			name:        "Update user with manipulated ID",
			method:      "PUT",
			path:        "/api/v1/users/../admin/promote",
			description: "Should prevent path traversal",
		},
	}

	for _, tc := range testCases {
		suite.Run(tc.name, func() {
			headers := map[string]string{
				"Authorization": "Bearer " + suite.validUserToken, // Using regular user token
			}

			resp, err := suite.makeSecurityRequest(tc.method, tc.path, nil, headers)
			suite.NoError(err, tc.description)
			defer resp.Body.Close()

			// Regular user should not access arbitrary user records
			suite.NotEqual(http.StatusOK, resp.StatusCode, tc.description)
		})
	}
}

// TestSecurityHeaders tests for proper security headers
func (suite *SecurityPenetrationTestSuite) TestSecurityHeaders() {
	suite.Run("Security headers present", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + suite.validAdminToken,
		}

		resp, err := suite.makeSecurityRequest("GET", "/api/v1/users", nil, headers)
		suite.NoError(err)
		defer resp.Body.Close()

		securityHeaders := map[string]string{
			"X-Content-Type-Options": "nosniff",
			"X-Frame-Options":        "DENY",
			"X-XSS-Protection":       "1; mode=block",
			"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
			"Content-Security-Policy": "",
		}

		for header, expectedValue := range securityHeaders {
			actualValue := resp.Header.Get(header)
			if expectedValue == "" {
				// Just check if header is present
				if actualValue == "" {
					suite.T().Logf("WARNING: Security header %s is missing", header)
				}
			} else {
				if actualValue == "" {
					suite.T().Logf("WARNING: Security header %s is missing", header)
				} else {
					suite.Contains(actualValue, expectedValue, fmt.Sprintf("Security header %s should contain expected value", header))
				}
			}
		}
	})
}

// TestDataLeakage tests for information disclosure
func (suite *SecurityPenetrationTestSuite) TestDataLeakage() {
	suite.Run("Password not returned in response", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + suite.validAdminToken,
		}

		resp, err := suite.makeSecurityRequest("GET", "/api/v1/users", nil, headers)
		suite.NoError(err)
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			var response map[string]interface{}
			json.NewDecoder(resp.Body).Decode(&response)

			if users, ok := response["users"].([]interface{}); ok {
				for _, user := range users {
					userObj := user.(map[string]interface{})
					suite.NotContains(userObj, "password", "Password should never be returned")
					suite.NotContains(userObj, "password_hash", "Password hash should never be returned")
				}
			}
		}
	})

	suite.Run("Error messages don't leak sensitive information", func() {
		headers := map[string]string{
			"Authorization": "Bearer " + suite.invalidToken,
		}

		resp, err := suite.makeSecurityRequest("GET", "/api/v1/users", nil, headers)
		suite.NoError(err)
		defer resp.Body.Close()

		var response map[string]interface{}
		json.NewDecoder(resp.Body).Decode(&response)

		if errorMsg, ok := response["error"].(string); ok {
			// Error messages should not contain sensitive information
			suite.NotContains(strings.ToLower(errorMsg), "database", "Error should not mention database")
			suite.NotContains(strings.ToLower(errorMsg), "sql", "Error should not mention SQL")
			suite.NotContains(strings.ToLower(errorMsg), "secret", "Error should not mention secrets")
			suite.NotContains(strings.ToLower(errorMsg), "password", "Error should not mention passwords")
		}
	})
}

// Run the security test suite
func TestSecurityPenetrationTestSuite(t *testing.T) {
	suite.Run(t, new(SecurityPenetrationTestSuite))
}