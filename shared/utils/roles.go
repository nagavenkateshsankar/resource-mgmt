package utils

import "errors"

// ValidRoles defines all valid user roles in the system
var ValidRoles = []string{"admin", "supervisor", "inspector", "viewer"}

// ValidRoleSet contains valid roles for O(1) lookup
var ValidRoleSet = map[string]bool{
	"admin":      true,
	"supervisor": true,
	"inspector":  true,
	"viewer":     true,
}

// IsValidRole checks if a role is valid
func IsValidRole(role string) bool {
	return ValidRoleSet[role]
}

// ValidateRole validates a role and returns an error if invalid
func ValidateRole(role string) error {
	if role == "" {
		return errors.New("role cannot be empty")
	}

	if !IsValidRole(role) {
		return errors.New("invalid role: must be one of admin, supervisor, inspector, or viewer")
	}

	return nil
}

// NormalizeRole normalizes a role by setting default if empty and validating
func NormalizeRole(role string) (string, error) {
	// Set default role if empty
	if role == "" {
		role = "inspector"
	}

	// Validate the role
	if err := ValidateRole(role); err != nil {
		return "", err
	}

	return role, nil
}

// GetRoleHierarchy returns the role hierarchy for privilege comparison
// Higher index means higher privilege level
func GetRoleHierarchy() map[string]int {
	return map[string]int{
		"viewer":     0,
		"inspector":  1,
		"supervisor": 2,
		"admin":      3,
	}
}

// HasHigherOrEqualPrivilege checks if role1 has higher or equal privilege than role2
func HasHigherOrEqualPrivilege(role1, role2 string) bool {
	hierarchy := GetRoleHierarchy()
	level1, exists1 := hierarchy[role1]
	level2, exists2 := hierarchy[role2]

	// If either role is invalid, return false
	if !exists1 || !exists2 {
		return false
	}

	return level1 >= level2
}