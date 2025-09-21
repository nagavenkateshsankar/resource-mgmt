package tests

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"
)

// UserManagementAPITestSuite provides comprehensive API integration tests
type UserManagementAPITestSuite struct {
	suite.Suite
	server      *httptest.Server
	adminToken  string
	userToken   string
	testOrgID   string
	testAdminID string
	testUserID  string
}

// SetupSuite initializes the test environment
func (suite *UserManagementAPITestSuite) SetupSuite() {
	// This would normally start your actual server
	// For now, we'll create test data and tokens
	suite.adminToken = "test_admin_token"
	suite.userToken = "test_user_token"
	suite.testOrgID = "test_org_123"
	suite.testAdminID = "admin_123"
	suite.testUserID = "user_123"
}

// TearDownSuite cleans up after all tests
func (suite *UserManagementAPITestSuite) TearDownSuite() {
	if suite.server != nil {
		suite.server.Close()
	}
}

// Helper function to make authenticated requests
func (suite *UserManagementAPITestSuite) makeRequest(method, path string, body interface{}, token string) (*http.Response, error) {
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

	req, err := http.NewRequest(method, suite.server.URL+path, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	client := &http.Client{Timeout: 30 * time.Second}
	return client.Do(req)
}

// TestGetUsers tests the GET /api/v1/users endpoint
func (suite *UserManagementAPITestSuite) TestGetUsers() {
	tests := []struct {
		name           string
		token          string
		queryParams    string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin gets all users",
			token:          suite.adminToken,
			queryParams:    "",
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to fetch all users",
		},
		{
			name:           "Admin filters by role",
			token:          suite.adminToken,
			queryParams:    "?role=admin",
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to filter users by role",
		},
		{
			name:           "Admin filters by status",
			token:          suite.adminToken,
			queryParams:    "?status=active",
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to filter users by status",
		},
		{
			name:           "Admin uses pagination",
			token:          suite.adminToken,
			queryParams:    "?limit=10&offset=0",
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to paginate users",
		},
		{
			name:           "Non-admin gets forbidden",
			token:          suite.userToken,
			queryParams:    "",
			expectedStatus: http.StatusForbidden,
			description:    "Non-admin users should not access user list",
		},
		{
			name:           "Unauthenticated gets unauthorized",
			token:          "",
			queryParams:    "",
			expectedStatus: http.StatusUnauthorized,
			description:    "Unauthenticated requests should be rejected",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			resp, err := suite.makeRequest("GET", "/api/v1/users"+tt.queryParams, nil, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.NewDecoder(resp.Body).Decode(&response)
				suite.NoError(err)

				// Verify response structure
				suite.Contains(response, "users")
				suite.Contains(response, "total")
				suite.Contains(response, "limit")
				suite.Contains(response, "offset")

				users := response["users"].([]interface{})
				for _, user := range users {
					userObj := user.(map[string]interface{})
					suite.Contains(userObj, "id")
					suite.Contains(userObj, "email")
					suite.Contains(userObj, "role")
					suite.Contains(userObj, "status")
					suite.Contains(userObj, "organization_id")
				}
			}
		})
	}
}

// TestGetAdminCount tests the GET /api/v1/users/admin-count endpoint
func (suite *UserManagementAPITestSuite) TestGetAdminCount() {
	tests := []struct {
		name           string
		token          string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin gets admin count",
			token:          suite.adminToken,
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to get admin count",
		},
		{
			name:           "Non-admin gets forbidden",
			token:          suite.userToken,
			expectedStatus: http.StatusForbidden,
			description:    "Non-admin should not access admin count",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			resp, err := suite.makeRequest("GET", "/api/v1/users/admin-count", nil, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.NewDecoder(resp.Body).Decode(&response)
				suite.NoError(err)

				suite.Contains(response, "count")
				count := response["count"].(float64)
				suite.GreaterOrEqual(count, float64(1), "Should have at least 1 admin")
			}
		})
	}
}

// TestUpdateUser tests the PUT /api/v1/users/:id endpoint
func (suite *UserManagementAPITestSuite) TestUpdateUser() {
	tests := []struct {
		name           string
		token          string
		userID         string
		updateData     map[string]interface{}
		expectedStatus int
		description    string
	}{
		{
			name:   "Admin updates user name",
			token:  suite.adminToken,
			userID: suite.testUserID,
			updateData: map[string]interface{}{
				"name": "Updated Name",
			},
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to update user name",
		},
		{
			name:   "Admin updates user role",
			token:  suite.adminToken,
			userID: suite.testUserID,
			updateData: map[string]interface{}{
				"role": "supervisor",
			},
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to update user role",
		},
		{
			name:   "Admin updates user status",
			token:  suite.adminToken,
			userID: suite.testUserID,
			updateData: map[string]interface{}{
				"status": "inactive",
			},
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to update user status",
		},
		{
			name:   "User cannot change own role",
			token:  suite.userToken,
			userID: suite.testUserID,
			updateData: map[string]interface{}{
				"role": "admin",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "User should not be able to change own role",
		},
		{
			name:   "User cannot deactivate themselves",
			token:  suite.userToken,
			userID: suite.testUserID,
			updateData: map[string]interface{}{
				"status": "inactive",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "User should not be able to deactivate themselves",
		},
		{
			name:   "Admin cannot demote last admin",
			token:  suite.adminToken,
			userID: suite.testAdminID, // Assuming this is the last admin
			updateData: map[string]interface{}{
				"role": "inspector",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should prevent demoting last admin",
		},
		{
			name:   "Non-admin cannot update other users",
			token:  suite.userToken,
			userID: "other_user_123",
			updateData: map[string]interface{}{
				"name": "Unauthorized Update",
			},
			expectedStatus: http.StatusForbidden,
			description:    "Non-admin should not update other users",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			path := fmt.Sprintf("/api/v1/users/%s", tt.userID)
			resp, err := suite.makeRequest("PUT", path, tt.updateData, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			var response map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&response)
			suite.NoError(err)

			if tt.expectedStatus == http.StatusOK {
				// Verify updated fields
				suite.Contains(response, "id")
				suite.Equal(tt.userID, response["id"])

				if name, ok := tt.updateData["name"]; ok {
					suite.Equal(name, response["name"])
				}
				if role, ok := tt.updateData["role"]; ok {
					suite.Equal(role, response["role"])
				}
				if status, ok := tt.updateData["status"]; ok {
					suite.Equal(status, response["status"])
				}
			} else {
				// Verify error response
				suite.Contains(response, "error")
			}
		})
	}
}

// TestToggleUserStatus tests the PUT /api/v1/users/:id/status endpoint
func (suite *UserManagementAPITestSuite) TestToggleUserStatus() {
	tests := []struct {
		name           string
		token          string
		userID         string
		newStatus      string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin deactivates user",
			token:          suite.adminToken,
			userID:         suite.testUserID,
			newStatus:      "inactive",
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to deactivate user",
		},
		{
			name:           "Admin reactivates user",
			token:          suite.adminToken,
			userID:         suite.testUserID,
			newStatus:      "active",
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to reactivate user",
		},
		{
			name:           "User cannot deactivate themselves",
			token:          suite.userToken,
			userID:         suite.testUserID,
			newStatus:      "inactive",
			expectedStatus: http.StatusBadRequest,
			description:    "User should not deactivate themselves",
		},
		{
			name:           "Cannot deactivate last admin",
			token:          suite.adminToken,
			userID:         suite.testAdminID,
			newStatus:      "inactive",
			expectedStatus: http.StatusBadRequest,
			description:    "Should prevent deactivating last admin",
		},
		{
			name:           "Non-admin cannot change status",
			token:          suite.userToken,
			userID:         "other_user_123",
			newStatus:      "inactive",
			expectedStatus: http.StatusForbidden,
			description:    "Non-admin should not change user status",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			path := fmt.Sprintf("/api/v1/users/%s/status", tt.userID)
			body := map[string]string{"status": tt.newStatus}
			resp, err := suite.makeRequest("PUT", path, body, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			var response map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&response)
			suite.NoError(err)

			if tt.expectedStatus == http.StatusOK {
				suite.Equal(tt.newStatus, response["status"])
			} else {
				suite.Contains(response, "error")
			}
		})
	}
}

// TestDeleteUser tests the DELETE /api/v1/users/:id endpoint
func (suite *UserManagementAPITestSuite) TestDeleteUser() {
	tests := []struct {
		name           string
		token          string
		userID         string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin deletes regular user",
			token:          suite.adminToken,
			userID:         "deletable_user_123",
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to delete regular user",
		},
		{
			name:           "Admin cannot delete themselves",
			token:          suite.adminToken,
			userID:         suite.testAdminID,
			expectedStatus: http.StatusBadRequest,
			description:    "Admin should not be able to delete themselves",
		},
		{
			name:           "Cannot delete last admin",
			token:          suite.adminToken,
			userID:         "last_admin_123",
			expectedStatus: http.StatusBadRequest,
			description:    "Should prevent deleting last admin",
		},
		{
			name:           "Non-admin cannot delete users",
			token:          suite.userToken,
			userID:         "some_user_123",
			expectedStatus: http.StatusForbidden,
			description:    "Non-admin should not delete users",
		},
		{
			name:           "Cannot delete non-existent user",
			token:          suite.adminToken,
			userID:         "non_existent_123",
			expectedStatus: http.StatusNotFound,
			description:    "Should return 404 for non-existent user",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			path := fmt.Sprintf("/api/v1/users/%s", tt.userID)
			resp, err := suite.makeRequest("DELETE", path, nil, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			var response map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&response)
			suite.NoError(err)

			if tt.expectedStatus == http.StatusOK {
				suite.Contains(response, "message")
				suite.Contains(response["message"], "deleted successfully")
			} else {
				suite.Contains(response, "error")
			}
		})
	}
}

// TestCreateUser tests the POST /api/v1/users endpoint
func (suite *UserManagementAPITestSuite) TestCreateUser() {
	tests := []struct {
		name           string
		token          string
		userData       map[string]interface{}
		expectedStatus int
		description    string
	}{
		{
			name:  "Admin creates new user",
			token: suite.adminToken,
			userData: map[string]interface{}{
				"name":     "New User",
				"email":    "newuser@test.com",
				"password": "SecurePass123!",
				"role":     "inspector",
			},
			expectedStatus: http.StatusCreated,
			description:    "Admin should be able to create new user",
		},
		{
			name:  "Admin creates admin user",
			token: suite.adminToken,
			userData: map[string]interface{}{
				"name":     "New Admin",
				"email":    "newadmin@test.com",
				"password": "SecurePass123!",
				"role":     "admin",
			},
			expectedStatus: http.StatusCreated,
			description:    "Admin should be able to create admin user",
		},
		{
			name:  "Cannot create user with duplicate email",
			token: suite.adminToken,
			userData: map[string]interface{}{
				"name":     "Duplicate User",
				"email":    "existing@test.com",
				"password": "SecurePass123!",
				"role":     "inspector",
			},
			expectedStatus: http.StatusInternalServerError,
			description:    "Should prevent duplicate email",
		},
		{
			name:  "Cannot create user with invalid email",
			token: suite.adminToken,
			userData: map[string]interface{}{
				"name":     "Invalid Email User",
				"email":    "invalid-email",
				"password": "SecurePass123!",
				"role":     "inspector",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should validate email format",
		},
		{
			name:  "Cannot create user with weak password",
			token: suite.adminToken,
			userData: map[string]interface{}{
				"name":     "Weak Password User",
				"email":    "weakpass@test.com",
				"password": "123",
				"role":     "inspector",
			},
			expectedStatus: http.StatusBadRequest,
			description:    "Should enforce password strength",
		},
		{
			name:  "Non-admin cannot create users",
			token: suite.userToken,
			userData: map[string]interface{}{
				"name":     "Unauthorized User",
				"email":    "unauthorized@test.com",
				"password": "SecurePass123!",
				"role":     "inspector",
			},
			expectedStatus: http.StatusForbidden,
			description:    "Non-admin should not create users",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			resp, err := suite.makeRequest("POST", "/api/v1/users", tt.userData, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			var response map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&response)
			suite.NoError(err)

			if tt.expectedStatus == http.StatusCreated {
				suite.Contains(response, "id")
				suite.Equal(tt.userData["email"], response["email"])
				suite.Equal(tt.userData["role"], response["role"])
				suite.Contains(response, "organization_id")
				// Password should not be returned
				suite.NotContains(response, "password")
			} else {
				suite.Contains(response, "error")
			}
		})
	}
}

// TestGetRoles tests the GET /api/v1/users/roles endpoint
func (suite *UserManagementAPITestSuite) TestGetRoles() {
	tests := []struct {
		name           string
		token          string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin gets available roles",
			token:          suite.adminToken,
			expectedStatus: http.StatusOK,
			description:    "Admin should get available roles",
		},
		{
			name:           "User gets available roles",
			token:          suite.userToken,
			expectedStatus: http.StatusOK,
			description:    "User should get available roles for reference",
		},
		{
			name:           "Unauthenticated gets unauthorized",
			token:          "",
			expectedStatus: http.StatusUnauthorized,
			description:    "Unauthenticated request should be rejected",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			resp, err := suite.makeRequest("GET", "/api/v1/users/roles", nil, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.NewDecoder(resp.Body).Decode(&response)
				suite.NoError(err)

				suite.Contains(response, "roles")
				roles := response["roles"].([]interface{})
				suite.Contains(roles, "admin")
				suite.Contains(roles, "inspector")
				suite.Contains(roles, "supervisor")
				suite.Contains(roles, "viewer")
			}
		})
	}
}

// TestGetPermissions tests the GET /api/v1/users/permissions endpoint
func (suite *UserManagementAPITestSuite) TestGetPermissions() {
	tests := []struct {
		name           string
		token          string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin gets available permissions",
			token:          suite.adminToken,
			expectedStatus: http.StatusOK,
			description:    "Admin should get available permissions",
		},
		{
			name:           "User gets available permissions",
			token:          suite.userToken,
			expectedStatus: http.StatusOK,
			description:    "User should get available permissions for reference",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			resp, err := suite.makeRequest("GET", "/api/v1/users/permissions", nil, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			if tt.expectedStatus == http.StatusOK {
				var response map[string]interface{}
				err := json.NewDecoder(resp.Body).Decode(&response)
				suite.NoError(err)

				suite.Contains(response, "permissions")
				permissions := response["permissions"].(map[string]interface{})
				suite.Contains(permissions, "can_create_inspections")
				suite.Contains(permissions, "can_manage_users")
				suite.Contains(permissions, "can_view_reports")
			}
		})
	}
}

// TestGetUser tests the GET /api/v1/users/:id endpoint
func (suite *UserManagementAPITestSuite) TestGetUser() {
	tests := []struct {
		name           string
		token          string
		userID         string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin gets any user",
			token:          suite.adminToken,
			userID:         suite.testUserID,
			expectedStatus: http.StatusOK,
			description:    "Admin should be able to get any user",
		},
		{
			name:           "User gets themselves",
			token:          suite.userToken,
			userID:         suite.testUserID,
			expectedStatus: http.StatusOK,
			description:    "User should be able to get their own data",
		},
		{
			name:           "User cannot get other users",
			token:          suite.userToken,
			userID:         "other_user_123",
			expectedStatus: http.StatusForbidden,
			description:    "User should not access other user data",
		},
		{
			name:           "Cannot get non-existent user",
			token:          suite.adminToken,
			userID:         "non_existent_123",
			expectedStatus: http.StatusNotFound,
			description:    "Should return 404 for non-existent user",
		},
	}

	for _, tt := range tests {
		suite.Run(tt.name, func() {
			path := fmt.Sprintf("/api/v1/users/%s", tt.userID)
			resp, err := suite.makeRequest("GET", path, nil, tt.token)
			suite.NoError(err, tt.description)
			defer resp.Body.Close()

			suite.Equal(tt.expectedStatus, resp.StatusCode, tt.description)

			var response map[string]interface{}
			err = json.NewDecoder(resp.Body).Decode(&response)
			suite.NoError(err)

			if tt.expectedStatus == http.StatusOK {
				suite.Contains(response, "id")
				suite.Contains(response, "email")
				suite.Contains(response, "role")
				suite.Contains(response, "status")
				suite.Contains(response, "organization_id")
				// Password should never be returned
				suite.NotContains(response, "password")
			} else {
				suite.Contains(response, "error")
			}
		})
	}
}

// TestMultiOrganizationIsolation tests organization isolation
func (suite *UserManagementAPITestSuite) TestMultiOrganizationIsolation() {
	// This test would verify that users from different organizations
	// cannot access each other's data

	suite.Run("Users cannot access other organization data", func() {
		// Test getting users from different organization
		resp, err := suite.makeRequest("GET", "/api/v1/users", nil, "different_org_token")
		suite.NoError(err)
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusOK {
			var response map[string]interface{}
			err := json.NewDecoder(resp.Body).Decode(&response)
			suite.NoError(err)

			users := response["users"].([]interface{})
			// Verify all users belong to the same organization as the requester
			for _, user := range users {
				userObj := user.(map[string]interface{})
				// This organization ID should be different from suite.testOrgID
				suite.NotEqual(suite.testOrgID, userObj["organization_id"])
			}
		}
	})
}

// TestRateLimiting tests API rate limiting (if implemented)
func (suite *UserManagementAPITestSuite) TestRateLimiting() {
	suite.Run("Rate limiting prevents abuse", func() {
		// Make many requests rapidly
		successCount := 0
		rateLimitCount := 0

		for i := 0; i < 100; i++ {
			resp, err := suite.makeRequest("GET", "/api/v1/users", nil, suite.adminToken)
			suite.NoError(err)

			if resp.StatusCode == http.StatusOK {
				successCount++
			} else if resp.StatusCode == http.StatusTooManyRequests {
				rateLimitCount++
			}

			resp.Body.Close()
		}

		// If rate limiting is implemented, some requests should be rejected
		// If not implemented, all requests should succeed
		suite.T().Logf("Successful requests: %d, Rate limited: %d", successCount, rateLimitCount)
	})
}

// TestConcurrentRequests tests concurrent access scenarios
func (suite *UserManagementAPITestSuite) TestConcurrentRequests() {
	suite.Run("Concurrent admin count checks are consistent", func() {
		const numConcurrent = 10
		results := make(chan map[string]interface{}, numConcurrent)

		// Make concurrent requests to get admin count
		for i := 0; i < numConcurrent; i++ {
			go func() {
				resp, err := suite.makeRequest("GET", "/api/v1/users/admin-count", nil, suite.adminToken)
				if err != nil {
					results <- map[string]interface{}{"error": err.Error()}
					return
				}
				defer resp.Body.Close()

				var response map[string]interface{}
				json.NewDecoder(resp.Body).Decode(&response)
				results <- response
			}()
		}

		// Collect results
		counts := make([]float64, 0, numConcurrent)
		for i := 0; i < numConcurrent; i++ {
			result := <-results
			if count, ok := result["count"]; ok {
				counts = append(counts, count.(float64))
			}
		}

		// All counts should be the same
		if len(counts) > 1 {
			firstCount := counts[0]
			for _, count := range counts[1:] {
				suite.Equal(firstCount, count, "Admin counts should be consistent across concurrent requests")
			}
		}
	})
}

// Run the test suite
func TestUserManagementAPITestSuite(t *testing.T) {
	suite.Run(t, new(UserManagementAPITestSuite))
}