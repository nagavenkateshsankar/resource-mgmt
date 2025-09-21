package repository

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"resource-mgmt/pkg/tenant"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// BaseRepositoryImpl provides the base implementation for tenant-aware repositories
type BaseRepositoryImpl[T any] struct {
	db        *gorm.DB
	tableName string
}

// NewBaseRepository creates a new base repository instance
func NewBaseRepository[T any](db *gorm.DB) *BaseRepositoryImpl[T] {
	var entity T
	tableName := getTableName(entity)

	return &BaseRepositoryImpl[T]{
		db:        db,
		tableName: tableName,
	}
}

// Create creates a new entity with automatic tenant context
func (r *BaseRepositoryImpl[T]) Create(ctx context.Context, entity *T) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	// Get tenant context
	tenantCtx, err := tenant.FromContext(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	// Set organization_id if the entity has this field
	if err := r.setOrganizationID(entity, tenantCtx.OrganizationID); err != nil {
		return fmt.Errorf("failed to set organization ID: %w", err)
	}

	// Set created_by if the entity has this field
	r.setCreatedBy(entity, tenantCtx.UserID)

	return r.db.WithContext(ctx).Create(entity).Error
}

// GetByID retrieves an entity by ID within tenant scope
func (r *BaseRepositoryImpl[T]) GetByID(ctx context.Context, id uint) (*T, error) {
	if r.db == nil {
		return nil, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, fmt.Errorf("tenant context required: %w", err)
	}

	var entity T
	err = r.buildTenantQuery(organizationID).First(&entity, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("record not found in organization scope")
		}
		return nil, err
	}

	return &entity, nil
}

// GetAll retrieves all entities within tenant scope with pagination
func (r *BaseRepositoryImpl[T]) GetAll(ctx context.Context, filters map[string]interface{}, limit, offset int) ([]T, int64, error) {
	if r.db == nil {
		return nil, 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("tenant context required: %w", err)
	}

	var entities []T
	var total int64

	query := r.buildTenantQuery(organizationID)

	// Apply additional filters
	for key, value := range filters {
		if key != "organization_id" { // Prevent organization_id override
			query = query.Where(fmt.Sprintf("%s = ?", key), value)
		}
	}

	// Count total records
	err = query.Model(new(T)).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err = query.Limit(limit).Offset(offset).Find(&entities).Error
	if err != nil {
		return nil, 0, err
	}

	return entities, total, nil
}

// Update updates an entity within tenant scope
func (r *BaseRepositoryImpl[T]) Update(ctx context.Context, id uint, updates map[string]interface{}) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	// Prevent organization_id updates
	delete(updates, "organization_id")

	result := r.buildTenantQuery(organizationID).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("record not found in organization scope")
	}

	return nil
}

// Delete soft deletes an entity within tenant scope
func (r *BaseRepositoryImpl[T]) Delete(ctx context.Context, id uint) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	result := r.buildTenantQuery(organizationID).Where("id = ?", id).Delete(new(T))
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("record not found in organization scope")
	}

	return nil
}

// Count returns the count of entities within tenant scope
func (r *BaseRepositoryImpl[T]) Count(ctx context.Context, filters map[string]interface{}) (int64, error) {
	if r.db == nil {
		return 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return 0, fmt.Errorf("tenant context required: %w", err)
	}

	query := r.buildTenantQuery(organizationID)

	// Apply additional filters
	for key, value := range filters {
		if key != "organization_id" { // Prevent organization_id override
			query = query.Where(fmt.Sprintf("%s = ?", key), value)
		}
	}

	var count int64
	err = query.Model(new(T)).Count(&count).Error
	return count, err
}

// Exists checks if an entity exists within tenant scope
func (r *BaseRepositoryImpl[T]) Exists(ctx context.Context, id uint) (bool, error) {
	if r.db == nil {
		return false, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return false, fmt.Errorf("tenant context required: %w", err)
	}

	var count int64
	err = r.buildTenantQuery(organizationID).Where("id = ?", id).Model(new(T)).Count(&count).Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// GetByUUID retrieves an entity by UUID within tenant scope
func (r *BaseRepositoryImpl[T]) GetByUUID(ctx context.Context, id uuid.UUID) (*T, error) {
	if r.db == nil {
		return nil, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, fmt.Errorf("tenant context required: %w", err)
	}

	var entity T
	err = r.buildTenantQuery(organizationID).Where("id = ?", id).First(&entity).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("record not found in organization scope")
		}
		return nil, err
	}

	return &entity, nil
}

// UpdateByUUID updates an entity by UUID within tenant scope
func (r *BaseRepositoryImpl[T]) UpdateByUUID(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	// Prevent organization_id updates
	delete(updates, "organization_id")

	result := r.buildTenantQuery(organizationID).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("record not found in organization scope")
	}

	return nil
}

// DeleteByUUID soft deletes an entity by UUID within tenant scope
func (r *BaseRepositoryImpl[T]) DeleteByUUID(ctx context.Context, id uuid.UUID) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	result := r.buildTenantQuery(organizationID).Where("id = ?", id).Delete(new(T))
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("record not found in organization scope")
	}

	return nil
}

// ExistsByUUID checks if an entity exists by UUID within tenant scope
func (r *BaseRepositoryImpl[T]) ExistsByUUID(ctx context.Context, id uuid.UUID) (bool, error) {
	if r.db == nil {
		return false, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return false, fmt.Errorf("tenant context required: %w", err)
	}

	var count int64
	err = r.buildTenantQuery(organizationID).Where("id = ?", id).Model(new(T)).Count(&count).Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

// buildTenantQuery builds a query with organization_id filter
func (r *BaseRepositoryImpl[T]) buildTenantQuery(organizationID string) *gorm.DB {
	return r.db.Where("organization_id = ?", organizationID)
}

// setOrganizationID sets the organization_id field using reflection
func (r *BaseRepositoryImpl[T]) setOrganizationID(entity *T, organizationID string) error {
	value := reflect.ValueOf(entity).Elem()
	field := value.FieldByName("OrganizationID")

	if !field.IsValid() {
		return nil // Field doesn't exist, which is okay for some entities
	}

	if !field.CanSet() {
		return errors.New("cannot set organization_id field")
	}

	field.SetString(organizationID)
	return nil
}

// setCreatedBy sets the created_by field using reflection
func (r *BaseRepositoryImpl[T]) setCreatedBy(entity *T, userID string) {
	value := reflect.ValueOf(entity).Elem()
	field := value.FieldByName("CreatedBy")

	if field.IsValid() && field.CanSet() {
		field.SetString(userID)
	}
}

// getTableName extracts table name from entity
func getTableName[T any](entity T) string {
	// Use reflection to get the type name
	entityType := reflect.TypeOf(entity)
	if entityType.Kind() == reflect.Ptr {
		entityType = entityType.Elem()
	}

	// Convert to snake_case (simplified)
	name := entityType.Name()
	return name // GORM will handle pluralization and snake_case conversion
}