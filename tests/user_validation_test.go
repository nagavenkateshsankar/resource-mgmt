package tests

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

// User model for testing validation logic
type User struct {
	ID             string
	OrganizationID string
	Name           string
	Email          string
	Role           string
	Status         string
}

// UserValidationResult represents validation result
type UserValidationResult struct {
	CanEdit         bool
	CanDelete       bool
	CanToggleStatus bool
	CanChangeRole   bool
	Reasons         []string
}

// ValidateUserActions mimics the frontend UserService validation logic
func ValidateUserActions(currentUser User, targetUser User, adminCount int) UserValidationResult {
	result := UserValidationResult{
		CanEdit:         false,
		CanDelete:       false,
		CanToggleStatus: false,
		CanChangeRole:   false,
		Reasons:         []string{},
	}

	// Basic permission checks
	isAdmin := currentUser.Role == "admin"
	isSelfAction := currentUser.ID == targetUser.ID
	isTargetAdmin := targetUser.Role == "admin"
	isLastAdmin := isTargetAdmin && adminCount <= 1

	// Edit permissions (profile info only)
	if isSelfAction || isAdmin {
		result.CanEdit = true
	} else {
		result.Reasons = append(result.Reasons, "Only admins can edit other users")
	}

	// Role change permissions
	if isAdmin && !isSelfAction {
		if !isLastAdmin {
			result.CanChangeRole = true
		} else {
			result.Reasons = append(result.Reasons, "Cannot change role of the last administrator")
		}
	} else if isSelfAction {
		result.Reasons = append(result.Reasons, "Cannot change your own role")
	} else {
		result.Reasons = append(result.Reasons, "Only administrators can change user roles")
	}

	// Status toggle permissions
	if isAdmin && !isSelfAction {
		if !isLastAdmin || targetUser.Status == "inactive" {
			result.CanToggleStatus = true
		} else {
			result.Reasons = append(result.Reasons, "Cannot deactivate the last active administrator")
		}
	} else if isSelfAction {
		result.Reasons = append(result.Reasons, "Cannot change your own account status")
	} else {
		result.Reasons = append(result.Reasons, "Only administrators can change user status")
	}

	// Delete permissions
	if isAdmin && !isSelfAction {
		if !isLastAdmin {
			result.CanDelete = true
		} else {
			result.Reasons = append(result.Reasons, "Cannot delete the last administrator")
		}
	} else if isSelfAction {
		result.Reasons = append(result.Reasons, "Cannot delete your own account")
	} else {
		result.Reasons = append(result.Reasons, "Only administrators can delete users")
	}

	return result
}

// Test suite for role management business rules
func TestUserValidation_AdminActions(t *testing.T) {
	admin := User{
		ID:             "admin1",
		OrganizationID: "org1",
		Role:           "admin",
		Status:         "active",
	}

	t.Run("Admin can edit other users", func(t *testing.T) {
		inspector := User{ID: "user1", Role: "inspector", Status: "active"}
		result := ValidateUserActions(admin, inspector, 2)

		assert.True(t, result.CanEdit)
		assert.True(t, result.CanChangeRole)
		assert.True(t, result.CanToggleStatus)
		assert.True(t, result.CanDelete)
	})

	t.Run("Admin can edit themselves (profile only)", func(t *testing.T) {
		result := ValidateUserActions(admin, admin, 2)

		assert.True(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
		assert.Contains(t, result.Reasons, "Cannot change your own role")
		assert.Contains(t, result.Reasons, "Cannot change your own account status")
		assert.Contains(t, result.Reasons, "Cannot delete your own account")
	})

	t.Run("Admin cannot delete/demote last admin", func(t *testing.T) {
		lastAdmin := User{ID: "lastadmin", Role: "admin", Status: "active"}
		result := ValidateUserActions(admin, lastAdmin, 1) // Only 1 admin

		assert.True(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
		assert.Contains(t, result.Reasons, "Cannot change role of the last administrator")
		assert.Contains(t, result.Reasons, "Cannot deactivate the last active administrator")
		assert.Contains(t, result.Reasons, "Cannot delete the last administrator")
	})

	t.Run("Admin can reactivate inactive admin even if last admin", func(t *testing.T) {
		inactiveAdmin := User{ID: "inactiveadmin", Role: "admin", Status: "inactive"}
		result := ValidateUserActions(admin, inactiveAdmin, 1) // Only 1 admin total

		assert.True(t, result.CanEdit)
		assert.False(t, result.CanChangeRole) // Still can't change role of last admin
		assert.True(t, result.CanToggleStatus) // Can reactivate
		assert.False(t, result.CanDelete)
	})
}

func TestUserValidation_InspectorActions(t *testing.T) {
	inspector := User{
		ID:             "inspector1",
		OrganizationID: "org1",
		Role:           "inspector",
		Status:         "active",
	}

	t.Run("Inspector can edit themselves only", func(t *testing.T) {
		result := ValidateUserActions(inspector, inspector, 2)

		assert.True(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
		assert.Contains(t, result.Reasons, "Cannot change your own role")
		assert.Contains(t, result.Reasons, "Cannot change your own account status")
		assert.Contains(t, result.Reasons, "Cannot delete your own account")
	})

	t.Run("Inspector cannot edit other users", func(t *testing.T) {
		otherUser := User{ID: "other1", Role: "inspector", Status: "active"}
		result := ValidateUserActions(inspector, otherUser, 2)

		assert.False(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
		assert.Contains(t, result.Reasons, "Only admins can edit other users")
		assert.Contains(t, result.Reasons, "Only administrators can change user roles")
		assert.Contains(t, result.Reasons, "Only administrators can change user status")
		assert.Contains(t, result.Reasons, "Only administrators can delete users")
	})

	t.Run("Inspector cannot manage admins", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin", Status: "active"}
		result := ValidateUserActions(inspector, admin, 2)

		assert.False(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
	})
}

func TestUserValidation_ViewerActions(t *testing.T) {
	viewer := User{
		ID:             "viewer1",
		OrganizationID: "org1",
		Role:           "viewer",
		Status:         "active",
	}

	t.Run("Viewer can edit themselves only", func(t *testing.T) {
		result := ValidateUserActions(viewer, viewer, 2)

		assert.True(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
	})

	t.Run("Viewer cannot manage any other users", func(t *testing.T) {
		inspector := User{ID: "inspector1", Role: "inspector", Status: "active"}
		result := ValidateUserActions(viewer, inspector, 2)

		assert.False(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
	})
}

func TestUserValidation_SupervisorActions(t *testing.T) {
	supervisor := User{
		ID:             "supervisor1",
		OrganizationID: "org1",
		Role:           "supervisor",
		Status:         "active",
	}

	t.Run("Supervisor can edit themselves only", func(t *testing.T) {
		result := ValidateUserActions(supervisor, supervisor, 2)

		assert.True(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
	})

	t.Run("Supervisor cannot manage other users", func(t *testing.T) {
		inspector := User{ID: "inspector1", Role: "inspector", Status: "active"}
		result := ValidateUserActions(supervisor, inspector, 2)

		assert.False(t, result.CanEdit)
		assert.False(t, result.CanChangeRole)
		assert.False(t, result.CanToggleStatus)
		assert.False(t, result.CanDelete)
	})
}

func TestUserValidation_EdgeCases(t *testing.T) {
	t.Run("Multiple admins scenario", func(t *testing.T) {
		admin1 := User{ID: "admin1", Role: "admin", Status: "active"}
		admin2 := User{ID: "admin2", Role: "admin", Status: "active"}

		// With 2 admins, admin1 can manage admin2
		result := ValidateUserActions(admin1, admin2, 2)

		assert.True(t, result.CanEdit)
		assert.True(t, result.CanChangeRole)
		assert.True(t, result.CanToggleStatus)
		assert.True(t, result.CanDelete)
	})

	t.Run("Zero admin count edge case", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin", Status: "active"}
		inspector := User{ID: "user1", Role: "inspector", Status: "active"}

		// Edge case: somehow admin count is 0
		result := ValidateUserActions(admin, inspector, 0)

		// Should still allow normal operations on non-admin users
		assert.True(t, result.CanEdit)
		assert.True(t, result.CanChangeRole)
		assert.True(t, result.CanToggleStatus)
		assert.True(t, result.CanDelete)
	})

	t.Run("Large admin count scenario", func(t *testing.T) {
		admin1 := User{ID: "admin1", Role: "admin", Status: "active"}
		admin2 := User{ID: "admin2", Role: "admin", Status: "active"}

		// With many admins, all operations should be allowed
		result := ValidateUserActions(admin1, admin2, 10)

		assert.True(t, result.CanEdit)
		assert.True(t, result.CanChangeRole)
		assert.True(t, result.CanToggleStatus)
		assert.True(t, result.CanDelete)
	})

	t.Run("Inactive user management", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin", Status: "active"}
		inactiveUser := User{ID: "user1", Role: "inspector", Status: "inactive"}

		result := ValidateUserActions(admin, inactiveUser, 2)

		// Admin should be able to manage inactive users
		assert.True(t, result.CanEdit)
		assert.True(t, result.CanChangeRole)
		assert.True(t, result.CanToggleStatus) // Can reactivate
		assert.True(t, result.CanDelete)
	})

	t.Run("Pending user management", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin", Status: "active"}
		pendingUser := User{ID: "user1", Role: "inspector", Status: "pending"}

		result := ValidateUserActions(admin, pendingUser, 2)

		// Admin should be able to manage pending users
		assert.True(t, result.CanEdit)
		assert.True(t, result.CanChangeRole)
		assert.True(t, result.CanToggleStatus) // Can activate
		assert.True(t, result.CanDelete)
	})
}

func TestUserValidation_ReasonMessages(t *testing.T) {
	t.Run("Comprehensive reason messages for inspector", func(t *testing.T) {
		inspector := User{ID: "inspector1", Role: "inspector", Status: "active"}
		admin := User{ID: "admin1", Role: "admin", Status: "active"}

		result := ValidateUserActions(inspector, admin, 1)

		// Should have specific reasons for each denied action
		expectedReasons := []string{
			"Only admins can edit other users",
			"Only administrators can change user roles",
			"Only administrators can change user status",
			"Only administrators can delete users",
		}

		for _, reason := range expectedReasons {
			assert.Contains(t, result.Reasons, reason)
		}
	})

	t.Run("Self-action reason messages", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin", Status: "active"}

		result := ValidateUserActions(admin, admin, 1)

		expectedReasons := []string{
			"Cannot change your own role",
			"Cannot change your own account status",
			"Cannot delete your own account",
		}

		for _, reason := range expectedReasons {
			assert.Contains(t, result.Reasons, reason)
		}
	})

	t.Run("Last admin protection reasons", func(t *testing.T) {
		admin1 := User{ID: "admin1", Role: "admin", Status: "active"}
		admin2 := User{ID: "admin2", Role: "admin", Status: "active"}

		result := ValidateUserActions(admin1, admin2, 1) // Last admin

		expectedReasons := []string{
			"Cannot change role of the last administrator",
			"Cannot deactivate the last active administrator",
			"Cannot delete the last administrator",
		}

		for _, reason := range expectedReasons {
			assert.Contains(t, result.Reasons, reason)
		}
	})
}

// Test Role Change Validation specifically
func TestValidateRoleChange(t *testing.T) {
	type RoleChangeValidation struct {
		Valid  bool
		Reason string
	}

	validateRoleChange := func(currentUser User, targetUser User, newRole string, adminCount int) RoleChangeValidation {
		// Only admins can change roles
		if currentUser.Role != "admin" {
			return RoleChangeValidation{Valid: false, Reason: "Only administrators can change user roles"}
		}

		// Can't change own role
		if currentUser.ID == targetUser.ID {
			return RoleChangeValidation{Valid: false, Reason: "Cannot change your own role"}
		}

		// Can't demote the last admin
		if targetUser.Role == "admin" && newRole != "admin" && adminCount <= 1 {
			return RoleChangeValidation{Valid: false, Reason: "Cannot demote the last administrator"}
		}

		return RoleChangeValidation{Valid: true}
	}

	t.Run("Valid role changes", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin"}
		inspector := User{ID: "user1", Role: "inspector"}

		// Admin promoting inspector to admin
		result := validateRoleChange(admin, inspector, "admin", 2)
		assert.True(t, result.Valid)

		// Admin demoting inspector to viewer
		result = validateRoleChange(admin, inspector, "viewer", 2)
		assert.True(t, result.Valid)

		// Admin demoting another admin when multiple admins exist
		admin2 := User{ID: "admin2", Role: "admin"}
		result = validateRoleChange(admin, admin2, "inspector", 2)
		assert.True(t, result.Valid)
	})

	t.Run("Invalid role changes", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin"}
		inspector := User{ID: "user1", Role: "inspector"}

		// Non-admin trying to change roles
		result := validateRoleChange(inspector, admin, "inspector", 2)
		assert.False(t, result.Valid)
		assert.Equal(t, "Only administrators can change user roles", result.Reason)

		// Admin trying to change own role
		result = validateRoleChange(admin, admin, "inspector", 2)
		assert.False(t, result.Valid)
		assert.Equal(t, "Cannot change your own role", result.Reason)

		// Admin trying to demote last admin
		lastAdmin := User{ID: "admin2", Role: "admin"}
		result = validateRoleChange(admin, lastAdmin, "inspector", 1)
		assert.False(t, result.Valid)
		assert.Equal(t, "Cannot demote the last administrator", result.Reason)
	})
}

// Test Status Change Validation specifically
func TestValidateStatusChange(t *testing.T) {
	type StatusChangeValidation struct {
		Valid  bool
		Reason string
	}

	validateStatusChange := func(currentUser User, targetUser User, newStatus string, adminCount int) StatusChangeValidation {
		// Only admins can change status
		if currentUser.Role != "admin" {
			return StatusChangeValidation{Valid: false, Reason: "Only administrators can change user status"}
		}

		// Can't change own status to inactive
		if currentUser.ID == targetUser.ID && newStatus != "active" {
			return StatusChangeValidation{Valid: false, Reason: "Cannot deactivate your own account"}
		}

		// Can't deactivate the last admin
		if targetUser.Role == "admin" && newStatus != "active" && adminCount <= 1 {
			return StatusChangeValidation{Valid: false, Reason: "Cannot deactivate the last administrator"}
		}

		return StatusChangeValidation{Valid: true}
	}

	t.Run("Valid status changes", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin"}
		inspector := User{ID: "user1", Role: "inspector", Status: "active"}

		// Admin deactivating inspector
		result := validateStatusChange(admin, inspector, "inactive", 2)
		assert.True(t, result.Valid)

		// Admin activating inspector
		result = validateStatusChange(admin, inspector, "active", 2)
		assert.True(t, result.Valid)

		// Admin deactivating another admin when multiple admins exist
		admin2 := User{ID: "admin2", Role: "admin", Status: "active"}
		result = validateStatusChange(admin, admin2, "inactive", 2)
		assert.True(t, result.Valid)
	})

	t.Run("Invalid status changes", func(t *testing.T) {
		admin := User{ID: "admin1", Role: "admin"}
		inspector := User{ID: "user1", Role: "inspector"}

		// Non-admin trying to change status
		result := validateStatusChange(inspector, admin, "inactive", 2)
		assert.False(t, result.Valid)
		assert.Equal(t, "Only administrators can change user status", result.Reason)

		// Admin trying to deactivate themselves
		result = validateStatusChange(admin, admin, "inactive", 2)
		assert.False(t, result.Valid)
		assert.Equal(t, "Cannot deactivate your own account", result.Reason)

		// Admin trying to deactivate last admin
		lastAdmin := User{ID: "admin2", Role: "admin", Status: "active"}
		result = validateStatusChange(admin, lastAdmin, "inactive", 1)
		assert.False(t, result.Valid)
		assert.Equal(t, "Cannot deactivate the last administrator", result.Reason)
	})
}