package tenant

import (
	"context"
	"errors"
)

// ContextKey is a custom type for context keys to avoid collisions
type ContextKey string

const (
	// OrganizationIDKey is the key for organization ID in context
	OrganizationIDKey ContextKey = "organization_id"
	// UserIDKey is the key for user ID in context
	UserIDKey ContextKey = "user_id"
	// UserRoleKey is the key for user role in context
	UserRoleKey ContextKey = "user_role"
)

// Context represents the tenant-specific context for multi-tenant operations
type Context struct {
	OrganizationID string
	UserID         string
	UserRole       string
}

// NewContext creates a new tenant context
func NewContext(organizationID, userID, userRole string) *Context {
	return &Context{
		OrganizationID: organizationID,
		UserID:         userID,
		UserRole:       userRole,
	}
}

// WithTenantContext adds tenant context to the given context
func WithTenantContext(ctx context.Context, tenantCtx *Context) context.Context {
	ctx = context.WithValue(ctx, OrganizationIDKey, tenantCtx.OrganizationID)
	ctx = context.WithValue(ctx, UserIDKey, tenantCtx.UserID)
	ctx = context.WithValue(ctx, UserRoleKey, tenantCtx.UserRole)
	return ctx
}

// FromContext extracts tenant context from the given context
func FromContext(ctx context.Context) (*Context, error) {
	organizationID, ok := ctx.Value(OrganizationIDKey).(string)
	if !ok || organizationID == "" {
		return nil, errors.New("organization ID not found in context")
	}

	userID, ok := ctx.Value(UserIDKey).(string)
	if !ok || userID == "" {
		return nil, errors.New("user ID not found in context")
	}

	userRole, ok := ctx.Value(UserRoleKey).(string)
	if !ok || userRole == "" {
		return nil, errors.New("user role not found in context")
	}

	return &Context{
		OrganizationID: organizationID,
		UserID:         userID,
		UserRole:       userRole,
	}, nil
}

// GetOrganizationID extracts organization ID from context
func GetOrganizationID(ctx context.Context) (string, error) {
	organizationID, ok := ctx.Value(OrganizationIDKey).(string)
	if !ok || organizationID == "" {
		return "", errors.New("organization ID not found in context")
	}
	return organizationID, nil
}

// GetUserID extracts user ID from context
func GetUserID(ctx context.Context) (string, error) {
	userID, ok := ctx.Value(UserIDKey).(string)
	if !ok || userID == "" {
		return "", errors.New("user ID not found in context")
	}
	return userID, nil
}

// GetUserRole extracts user role from context
func GetUserRole(ctx context.Context) (string, error) {
	userRole, ok := ctx.Value(UserRoleKey).(string)
	if !ok || userRole == "" {
		return "", errors.New("user role not found in context")
	}
	return userRole, nil
}

// Validate ensures the tenant context is valid
func (tc *Context) Validate() error {
	if tc.OrganizationID == "" {
		return errors.New("organization ID is required")
	}
	if tc.UserID == "" {
		return errors.New("user ID is required")
	}
	if tc.UserRole == "" {
		return errors.New("user role is required")
	}
	return nil
}

// IsAdmin checks if the user has admin role
func (tc *Context) IsAdmin() bool {
	return tc.UserRole == "admin"
}

// IsSupervisor checks if the user has supervisor role
func (tc *Context) IsSupervisor() bool {
	return tc.UserRole == "supervisor"
}

// CanAccessAllData checks if user can access organization-wide data
func (tc *Context) CanAccessAllData() bool {
	return tc.IsAdmin() || tc.IsSupervisor()
}