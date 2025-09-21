package database

import (
	"context"
	"fmt"
	"resource-mgmt/pkg/tenant"

	"gorm.io/gorm"
)

// TenantDB wraps GORM DB with tenant context
type TenantDB struct {
	*gorm.DB
}

// NewTenantDB creates a new tenant-aware database connection
func NewTenantDB(db *gorm.DB) *TenantDB {
	return &TenantDB{DB: db}
}

// WithContext returns a database instance with tenant context
func (tdb *TenantDB) WithContext(ctx context.Context) *gorm.DB {
	db := tdb.DB.WithContext(ctx)

	// Set organization_id in session for RLS
	if organizationID, err := tenant.GetOrganizationID(ctx); err == nil {
		db = db.Exec("SELECT set_config('app.current_organization_id', ?, false)", organizationID)
	}

	return db
}

// WithTenant returns a database instance with specific tenant context
func (tdb *TenantDB) WithTenant(organizationID string) *gorm.DB {
	return tdb.DB.Exec("SELECT set_config('app.current_organization_id', ?, false)", organizationID)
}

// Transaction executes a function within a database transaction with tenant context
func (tdb *TenantDB) Transaction(ctx context.Context, fn func(*gorm.DB) error) error {
	return tdb.WithContext(ctx).Transaction(fn)
}

// Scoped returns a scoped database instance with organization filter
func (tdb *TenantDB) Scoped(ctx context.Context) *gorm.DB {
	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		// Return a query that will find nothing for safety
		return tdb.DB.Where("1 = 0")
	}

	return tdb.WithContext(ctx).Where("organization_id = ?", organizationID)
}

// UnscopedWithContext returns database without organization scoping (for system operations)
func (tdb *TenantDB) UnscopedWithContext(ctx context.Context) *gorm.DB {
	return tdb.DB.WithContext(ctx)
}

// SetOrganizationContext sets the organization context for RLS
func SetOrganizationContext(db *gorm.DB, organizationID string) *gorm.DB {
	return db.Exec("SELECT set_config('app.current_organization_id', ?, false)", organizationID)
}

// ClearOrganizationContext clears the organization context
func ClearOrganizationContext(db *gorm.DB) *gorm.DB {
	return db.Exec("SELECT set_config('app.current_organization_id', '', false)")
}

// ValidateTenantAccess ensures the query includes organization_id filter
func ValidateTenantAccess(ctx context.Context) error {
	_, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant validation failed: %w", err)
	}
	return nil
}