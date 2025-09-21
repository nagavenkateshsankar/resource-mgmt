package services

import (
	"context"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupOrgValidatorTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&models.GlobalUser{}, &models.Organization{}, &models.OrganizationMember{}, &models.Inspection{}, &models.Template{}, &models.Site{})
	require.NoError(t, err)

	return db
}

func createTestOrgData(t *testing.T, db *gorm.DB) (*models.GlobalUser, *models.Organization, *models.OrganizationMember) {
	user := &models.GlobalUser{
		ID:    "user-123",
		Email: "test@example.com",
		Name:  "Test User",
	}
	require.NoError(t, db.Create(user).Error)

	org := &models.Organization{
		ID:       "org-123",
		Name:     "Test Organization",
		IsActive: true,
	}
	require.NoError(t, db.Create(org).Error)

	member := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: org.ID,
		Role:           "admin",
		Status:         "active",
		IsOrgAdmin:     true,
		IsPrimary:      true,
		JoinedAt:       time.Now(),
	}
	require.NoError(t, db.Create(member).Error)

	return user, org, member
}

func TestOrganizationValidator_ValidateUserOrganizationAccess(t *testing.T) {
	testDB := setupOrgValidatorTestDB(t)
	originalDB := config.DB
	config.DB = testDB
	defer func() { config.DB = originalDB }()

	validator := NewOrganizationValidator()
	user, org, _ := createTestOrgData(t, testDB)

	// Create additional test data
	inactiveOrg := &models.Organization{
		ID:       "inactive-org",
		Name:     "Inactive Organization",
		IsActive: false,
	}
	testDB.Create(inactiveOrg)

	inactiveMember := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: inactiveOrg.ID,
		Role:           "admin",
		Status:         "inactive",
	}
	testDB.Create(inactiveMember)

	suspendedOrg := &models.Organization{
		ID:       "suspended-org",
		Name:     "Suspended Organization",
		IsActive: false, // Organization suspended
	}
	testDB.Create(suspendedOrg)

	suspendedMember := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: suspendedOrg.ID,
		Role:           "admin",
		Status:         "active",
	}
	testDB.Create(suspendedMember)

	tests := []struct {
		name           string
		userID         string
		organizationID string
		expectedError  error
		expectContext  bool
		expectedRole   string
	}{
		{
			name:           "Valid user and organization access",
			userID:         user.ID,
			organizationID: org.ID,
			expectedError:  nil,
			expectContext:  true,
			expectedRole:   "admin",
		},
		{
			name:           "Non-existent user",
			userID:         "non-existent-user",
			organizationID: org.ID,
			expectedError:  ErrUserNotFound,
			expectContext:  false,
		},
		{
			name:           "Non-existent organization",
			userID:         user.ID,
			organizationID: "non-existent-org",
			expectedError:  ErrOrganizationNotFound,
			expectContext:  false,
		},
		{
			name:           "User not member of organization",
			userID:         user.ID,
			organizationID: "org-456", // Will be created but user not a member
			expectedError:  ErrUserNotMemberOfOrg,
			expectContext:  false,
		},
		{
			name:           "Inactive membership",
			userID:         user.ID,
			organizationID: inactiveOrg.ID,
			expectedError:  ErrMembershipInactive,
			expectContext:  false,
		},
		{
			name:           "Suspended organization",
			userID:         user.ID,
			organizationID: suspendedOrg.ID,
			expectedError:  ErrOrganizationSuspended,
			expectContext:  false,
		},
	}

	// Create the organization that user is not a member of
	testDB.Create(&models.Organization{
		ID:       "org-456",
		Name:     "Other Organization",
		IsActive: true,
	})

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			result, err := validator.ValidateUserOrganizationAccess(ctx, tt.userID, tt.organizationID)

			if tt.expectedError != nil {
				assert.Error(t, err)
				assert.ErrorIs(t, err, tt.expectedError)
				assert.Nil(t, result)
			} else {
				assert.NoError(t, err)
				assert.NotNil(t, result)

				if tt.expectContext {
					assert.Equal(t, user.ID, result.User.ID)
					assert.Equal(t, org.ID, result.Organization.ID)
					assert.Equal(t, tt.expectedRole, result.Membership.Role)
					assert.True(t, result.IsAdmin)
					assert.True(t, result.CanAccessAll)
					assert.NotNil(t, result.Permissions)
					assert.NotNil(t, result.LastAccessed)
				}
			}
		})
	}
}

func TestOrganizationValidator_ValidateOperationPermission(t *testing.T) {
	testDB := setupOrgValidatorTestDB(t)
	validator := NewOrganizationValidator()
	validator.db = testDB

	// Create test context for admin user
	adminContext := &ValidatedOrganizationContext{
		IsAdmin: true,
		Permissions: map[string]interface{}{
			"can_create_inspections": true,
			"can_manage_users":       true,
		},
	}

	// Create test context for inspector user
	inspectorContext := &ValidatedOrganizationContext{
		IsAdmin: false,
		Permissions: map[string]interface{}{
			"can_create_inspections": true,
			"can_manage_users":       false,
		},
	}

	tests := []struct {
		name        string
		context     *ValidatedOrganizationContext
		operation   string
		expectError bool
		description string
	}{
		{
			name:        "Admin can perform any operation",
			context:     adminContext,
			operation:   "can_delete_everything",
			expectError: false,
			description: "Admin should have all permissions",
		},
		{
			name:        "Inspector can perform allowed operation",
			context:     inspectorContext,
			operation:   "can_create_inspections",
			expectError: false,
			description: "Inspector should be able to create inspections",
		},
		{
			name:        "Inspector cannot perform forbidden operation",
			context:     inspectorContext,
			operation:   "can_manage_users",
			expectError: true,
			description: "Inspector should not be able to manage users",
		},
		{
			name:        "Inspector cannot perform undefined operation",
			context:     inspectorContext,
			operation:   "can_launch_nukes",
			expectError: true,
			description: "Inspector should not have undefined permissions",
		},
		{
			name:        "Nil context should fail",
			context:     nil,
			operation:   "can_create_inspections",
			expectError: true,
			description: "Nil context should always fail",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateOperationPermission(tt.context, tt.operation)

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)
			}
		})
	}
}

func TestOrganizationValidator_ValidateResourceAccess(t *testing.T) {
	testDB := setupOrgValidatorTestDB(t)
	originalDB := config.DB
	config.DB = testDB
	defer func() { config.DB = originalDB }()

	validator := NewOrganizationValidator()
	user, org, _ := createTestOrgData(t, testDB)

	// Create another organization and user for testing isolation
	otherOrg := &models.Organization{
		ID:       "other-org",
		Name:     "Other Organization",
		IsActive: true,
	}
	testDB.Create(otherOrg)

	otherUser := &models.GlobalUser{
		ID:    "other-user",
		Email: "other@example.com",
		Name:  "Other User",
	}
	testDB.Create(otherUser)

	otherMember := &models.OrganizationMember{
		UserID:         otherUser.ID,
		OrganizationID: otherOrg.ID,
		Role:           "inspector",
		Status:         "active",
	}
	testDB.Create(otherMember)

	// Create test resources
	inspection := &models.Inspection{
		ID:             "inspection-123",
		OrganizationID: org.ID,
		InspectorID:    user.ID,
		Title:          "Test Inspection",
	}
	testDB.Create(inspection)

	otherOrgInspection := &models.Inspection{
		ID:             "inspection-456",
		OrganizationID: otherOrg.ID,
		InspectorID:    otherUser.ID,
		Title:          "Other Org Inspection",
	}
	testDB.Create(otherOrgInspection)

	template := &models.Template{
		ID:             "template-123",
		OrganizationID: org.ID,
		Name:           "Test Template",
	}
	testDB.Create(template)

	site := &models.Site{
		ID:             "site-123",
		OrganizationID: org.ID,
		Name:           "Test Site",
	}
	testDB.Create(site)

	tests := []struct {
		name         string
		userID       string
		orgID        string
		resourceType string
		resourceID   string
		expectError  bool
		description  string
	}{
		{
			name:         "Admin can access organization inspection",
			userID:       user.ID,
			orgID:        org.ID,
			resourceType: "inspection",
			resourceID:   inspection.ID,
			expectError:  false,
			description:  "Admin should access own org inspection",
		},
		{
			name:         "User cannot access other org inspection",
			userID:       user.ID,
			orgID:        org.ID,
			resourceType: "inspection",
			resourceID:   otherOrgInspection.ID,
			expectError:  true,
			description:  "Should not access other org's inspection",
		},
		{
			name:         "User can access organization template",
			userID:       user.ID,
			orgID:        org.ID,
			resourceType: "template",
			resourceID:   template.ID,
			expectError:  false,
			description:  "Should access own org template",
		},
		{
			name:         "User can access organization site",
			userID:       user.ID,
			orgID:        org.ID,
			resourceType: "site",
			resourceID:   site.ID,
			expectError:  false,
			description:  "Should access own org site",
		},
		{
			name:         "Unknown resource type should fail",
			userID:       user.ID,
			orgID:        org.ID,
			resourceType: "unknown",
			resourceID:   "resource-123",
			expectError:  true,
			description:  "Unknown resource type should fail",
		},
		{
			name:         "Non-existent resource should fail",
			userID:       user.ID,
			orgID:        org.ID,
			resourceType: "inspection",
			resourceID:   "non-existent",
			expectError:  true,
			description:  "Non-existent resource should fail",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateResourceAccess(tt.userID, tt.orgID, tt.resourceType, tt.resourceID)

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)
			}
		})
	}
}

func TestOrganizationValidator_ValidateUserExistsInOrganization(t *testing.T) {
	testDB := setupOrgValidatorTestDB(t)
	originalDB := config.DB
	config.DB = testDB
	defer func() { config.DB = originalDB }()

	validator := NewOrganizationValidator()
	user, org, _ := createTestOrgData(t, testDB)

	tests := []struct {
		name           string
		userID         string
		organizationID string
		expectError    bool
		description    string
	}{
		{
			name:           "Valid user in organization",
			userID:         user.ID,
			organizationID: org.ID,
			expectError:    false,
			description:    "Should validate existing membership",
		},
		{
			name:           "User not in organization",
			userID:         "non-member-user",
			organizationID: org.ID,
			expectError:    true,
			description:    "Should fail for non-member",
		},
		{
			name:           "Non-existent organization",
			userID:         user.ID,
			organizationID: "non-existent-org",
			expectError:    true,
			description:    "Should fail for non-existent org",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.ValidateUserExistsInOrganization(tt.userID, tt.organizationID)

			if tt.expectError {
				assert.Error(t, err, tt.description)
				assert.ErrorIs(t, err, ErrUserNotMemberOfOrg)
			} else {
				assert.NoError(t, err, tt.description)
			}
		})
	}
}

func TestOrganizationValidator_GetUserActiveOrganizations(t *testing.T) {
	testDB := setupOrgValidatorTestDB(t)
	originalDB := config.DB
	config.DB = testDB
	defer func() { config.DB = originalDB }()

	validator := NewOrganizationValidator()
	user, org1, _ := createTestOrgData(t, testDB)

	// Create second organization
	org2 := &models.Organization{
		ID:       "org-456",
		Name:     "Second Organization",
		IsActive: true,
	}
	testDB.Create(org2)

	member2 := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: org2.ID,
		Role:           "supervisor",
		Status:         "active",
		JoinedAt:       time.Now(),
	}
	testDB.Create(member2)

	// Create inactive organization
	inactiveOrg := &models.Organization{
		ID:       "inactive-org",
		Name:     "Inactive Organization",
		IsActive: false,
	}
	testDB.Create(inactiveOrg)

	inactiveMember := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: inactiveOrg.ID,
		Role:           "admin",
		Status:         "active",
	}
	testDB.Create(inactiveMember)

	// Create membership with inactive status
	org3 := &models.Organization{
		ID:       "org-789",
		Name:     "Third Organization",
		IsActive: true,
	}
	testDB.Create(org3)

	inactiveStatusMember := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: org3.ID,
		Role:           "inspector",
		Status:         "inactive",
		JoinedAt:       time.Now(),
	}
	testDB.Create(inactiveStatusMember)

	organizations, err := validator.GetUserActiveOrganizations(user.ID)
	require.NoError(t, err)

	// Should return only active organizations with active memberships
	assert.Len(t, organizations, 2)

	// Check that returned organizations are correct
	orgIDs := make([]string, len(organizations))
	for i, org := range organizations {
		orgIDs[i] = org.OrganizationID
	}

	assert.Contains(t, orgIDs, org1.ID)
	assert.Contains(t, orgIDs, org2.ID)
	assert.NotContains(t, orgIDs, inactiveOrg.ID) // Inactive org should be excluded
	assert.NotContains(t, orgIDs, org3.ID)       // Inactive membership should be excluded

	// Verify roles are correct
	for _, org := range organizations {
		if org.OrganizationID == org1.ID {
			assert.Equal(t, "admin", org.Role)
			assert.True(t, org.IsOrgAdmin)
		} else if org.OrganizationID == org2.ID {
			assert.Equal(t, "supervisor", org.Role)
			assert.False(t, org.IsOrgAdmin)
		}
	}
}

func TestOrganizationValidator_InspectionAccess(t *testing.T) {
	testDB := setupOrgValidatorTestDB(t)
	validator := NewOrganizationValidator()
	validator.db = testDB

	user := &models.GlobalUser{ID: "user-123"}
	org := &models.Organization{ID: "org-123"}

	// Create contexts for different roles
	adminContext := &ValidatedOrganizationContext{
		User:         user,
		Organization: org,
		Permissions: map[string]interface{}{
			"can_view_all_inspections": true,
		},
	}

	inspectorContext := &ValidatedOrganizationContext{
		User:         user,
		Organization: org,
		Permissions: map[string]interface{}{
			"can_view_all_inspections": false,
		},
	}

	// Create test inspection
	inspection := &models.Inspection{
		ID:             "inspection-123",
		OrganizationID: org.ID,
		InspectorID:    user.ID,
	}
	testDB.Create(inspection)

	otherUserInspection := &models.Inspection{
		ID:             "inspection-456",
		OrganizationID: org.ID,
		InspectorID:    "other-user",
	}
	testDB.Create(otherUserInspection)

	tests := []struct {
		name         string
		context      *ValidatedOrganizationContext
		inspectionID string
		expectError  bool
		description  string
	}{
		{
			name:         "Admin can access any inspection",
			context:      adminContext,
			inspectionID: inspection.ID,
			expectError:  false,
			description:  "Admin with view_all permission should access any inspection",
		},
		{
			name:         "Admin can access other user's inspection",
			context:      adminContext,
			inspectionID: otherUserInspection.ID,
			expectError:  false,
			description:  "Admin should access other user's inspection",
		},
		{
			name:         "Inspector can access own inspection",
			context:      inspectorContext,
			inspectionID: inspection.ID,
			expectError:  false,
			description:  "Inspector should access own inspection",
		},
		{
			name:         "Inspector cannot access other's inspection",
			context:      inspectorContext,
			inspectionID: otherUserInspection.ID,
			expectError:  true,
			description:  "Inspector should not access other's inspection",
		},
		{
			name:         "Cannot access non-existent inspection",
			context:      adminContext,
			inspectionID: "non-existent",
			expectError:  true,
			description:  "Should fail for non-existent inspection",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validator.validateInspectionAccess(tt.context, tt.inspectionID)

			if tt.expectError {
				assert.Error(t, err, tt.description)
			} else {
				assert.NoError(t, err, tt.description)
			}
		})
	}
}

func TestOrganizationValidator_GetPermissionsForRole(t *testing.T) {
	validator := NewOrganizationValidator()

	tests := []struct {
		role                 string
		expectedPermissions  map[string]interface{}
		criticalPermissions  []string
		forbiddenPermissions []string
	}{
		{
			role: "admin",
			criticalPermissions: []string{
				"can_create_inspections",
				"can_view_all_inspections",
				"can_edit_inspections",
				"can_delete_inspections",
				"can_manage_templates",
				"can_manage_users",
				"can_view_reports",
				"can_export_reports",
				"can_manage_organization",
				"can_manage_sites",
			},
			forbiddenPermissions: []string{},
		},
		{
			role: "supervisor",
			criticalPermissions: []string{
				"can_create_inspections",
				"can_view_all_inspections",
				"can_edit_inspections",
				"can_manage_templates",
				"can_view_reports",
				"can_export_reports",
				"can_manage_sites",
			},
			forbiddenPermissions: []string{
				"can_delete_inspections",
				"can_manage_users",
				"can_manage_organization",
			},
		},
		{
			role: "inspector",
			criticalPermissions: []string{
				"can_create_inspections",
				"can_edit_inspections",
			},
			forbiddenPermissions: []string{
				"can_view_all_inspections",
				"can_delete_inspections",
				"can_manage_templates",
				"can_manage_users",
				"can_view_reports",
				"can_export_reports",
				"can_manage_organization",
				"can_manage_sites",
			},
		},
		{
			role: "viewer",
			criticalPermissions: []string{},
			forbiddenPermissions: []string{
				"can_create_inspections",
				"can_view_all_inspections",
				"can_edit_inspections",
				"can_delete_inspections",
				"can_manage_templates",
				"can_manage_users",
				"can_view_reports",
				"can_export_reports",
				"can_manage_organization",
				"can_manage_sites",
			},
		},
		{
			role: "unknown_role",
			criticalPermissions: []string{},
			forbiddenPermissions: []string{
				"can_create_inspections",
				"can_view_all_inspections",
				"can_edit_inspections",
				"can_delete_inspections",
				"can_manage_templates",
				"can_manage_users",
				"can_view_reports",
				"can_export_reports",
				"can_manage_organization",
				"can_manage_sites",
			},
		},
	}

	for _, tt := range tests {
		t.Run("Role: "+tt.role, func(t *testing.T) {
			permissions := validator.getPermissionsForRole(tt.role)

			// Check critical permissions are granted
			for _, perm := range tt.criticalPermissions {
				assert.True(t, permissions[perm].(bool), "Role %s should have permission %s", tt.role, perm)
			}

			// Check forbidden permissions are denied
			for _, perm := range tt.forbiddenPermissions {
				assert.False(t, permissions[perm].(bool), "Role %s should NOT have permission %s", tt.role, perm)
			}

			// Verify all permissions exist in the map
			expectedPermissions := []string{
				"can_create_inspections",
				"can_view_all_inspections",
				"can_edit_inspections",
				"can_delete_inspections",
				"can_manage_templates",
				"can_manage_users",
				"can_view_reports",
				"can_export_reports",
				"can_manage_organization",
				"can_manage_sites",
			}

			for _, perm := range expectedPermissions {
				_, exists := permissions[perm]
				assert.True(t, exists, "Permission %s should exist for role %s", perm, tt.role)
			}
		})
	}
}