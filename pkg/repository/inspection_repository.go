package repository

import (
	"context"
	"errors"
	"fmt"
	"resource-mgmt/models"
	"resource-mgmt/pkg/tenant"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// InspectionRepositoryImpl implements InspectionRepository with tenant isolation
type InspectionRepositoryImpl struct {
	db *gorm.DB
}

// NewInspectionRepository creates a new inspection repository
func NewInspectionRepository(db *gorm.DB) InspectionRepository {
	return &InspectionRepositoryImpl{
		db: db,
	}
}

// Create creates a new inspection within tenant scope
func (r *InspectionRepositoryImpl) Create(ctx context.Context, entity *models.Inspection) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	entity.OrganizationID = organizationID
	return r.db.Create(entity).Error
}

// GetByID retrieves an inspection by ID within tenant scope
func (r *InspectionRepositoryImpl) GetByID(ctx context.Context, id uint) (*models.Inspection, error) {
	if r.db == nil {
		return nil, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, fmt.Errorf("tenant context required: %w", err)
	}

	var inspection models.Inspection
	err = r.db.Where("organization_id = ? AND id = ?", organizationID, id).
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Preload("InspectionData").
		Preload("Attachments").
		First(&inspection).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("inspection not found in organization scope")
		}
		return nil, err
	}

	return &inspection, nil
}

// GetByUUID retrieves an inspection by UUID within tenant scope
func (r *InspectionRepositoryImpl) GetByUUID(ctx context.Context, id uuid.UUID) (*models.Inspection, error) {
	if r.db == nil {
		return nil, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, fmt.Errorf("tenant context required: %w", err)
	}

	var inspection models.Inspection
	err = r.db.Where("organization_id = ? AND id = ?", organizationID, id).
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Preload("InspectionData").
		Preload("Attachments").
		First(&inspection).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("inspection not found in organization scope")
		}
		return nil, err
	}

	return &inspection, nil
}

// GetAll retrieves all inspections within tenant scope with filters
func (r *InspectionRepositoryImpl) GetAll(ctx context.Context, filters map[string]interface{}, limit, offset int) ([]models.Inspection, int64, error) {
	if r.db == nil {
		return nil, 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("tenant context required: %w", err)
	}

	var inspections []models.Inspection
	var total int64

	query := r.db.Where("organization_id = ?", organizationID)

	// Apply filters
	for key, value := range filters {
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	// Count total
	err = query.Model(&models.Inspection{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results with preloads
	err = query.
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Preload("InspectionData").
		Preload("Attachments").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&inspections).Error

	if err != nil {
		return nil, 0, err
	}

	return inspections, total, nil
}

// Update updates an inspection within tenant scope
func (r *InspectionRepositoryImpl) Update(ctx context.Context, id uint, updates map[string]interface{}) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	result := r.db.Model(&models.Inspection{}).Where("organization_id = ? AND id = ?", organizationID, id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("inspection not found in organization scope")
	}

	return nil
}

// UpdateByUUID updates an inspection by UUID within tenant scope
func (r *InspectionRepositoryImpl) UpdateByUUID(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	result := r.db.Model(&models.Inspection{}).Where("organization_id = ? AND id = ?", organizationID, id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("inspection not found in organization scope")
	}

	return nil
}

// Delete deletes an inspection within tenant scope
func (r *InspectionRepositoryImpl) Delete(ctx context.Context, id uint) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	result := r.db.Where("organization_id = ? AND id = ?", organizationID, id).Delete(&models.Inspection{})
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("inspection not found in organization scope")
	}

	return nil
}

// DeleteByUUID deletes an inspection by UUID within tenant scope
func (r *InspectionRepositoryImpl) DeleteByUUID(ctx context.Context, id uuid.UUID) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	result := r.db.Where("organization_id = ? AND id = ?", organizationID, id).Delete(&models.Inspection{})
	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("inspection not found in organization scope")
	}

	return nil
}

// Count returns the count of inspections within tenant scope
func (r *InspectionRepositoryImpl) Count(ctx context.Context, filters map[string]interface{}) (int64, error) {
	if r.db == nil {
		return 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return 0, fmt.Errorf("tenant context required: %w", err)
	}

	var count int64
	query := r.db.Model(&models.Inspection{}).Where("organization_id = ?", organizationID)

	// Apply filters
	for key, value := range filters {
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	err = query.Count(&count).Error
	return count, err
}

// Exists checks if an inspection exists within tenant scope
func (r *InspectionRepositoryImpl) Exists(ctx context.Context, id uint) (bool, error) {
	if r.db == nil {
		return false, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return false, fmt.Errorf("tenant context required: %w", err)
	}

	var count int64
	err = r.db.Model(&models.Inspection{}).Where("organization_id = ? AND id = ?", organizationID, id).Count(&count).Error
	return count > 0, err
}

// ExistsByUUID checks if an inspection exists by UUID within tenant scope
func (r *InspectionRepositoryImpl) ExistsByUUID(ctx context.Context, id uuid.UUID) (bool, error) {
	if r.db == nil {
		return false, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return false, fmt.Errorf("tenant context required: %w", err)
	}

	var count int64
	err = r.db.Model(&models.Inspection{}).Where("organization_id = ? AND id = ?", organizationID, id).Count(&count).Error
	return count > 0, err
}

// GetByInspector retrieves inspections by inspector within tenant scope
func (r *InspectionRepositoryImpl) GetByInspector(ctx context.Context, inspectorID string, limit, offset int) ([]models.Inspection, int64, error) {
	if r.db == nil {
		return nil, 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("tenant context required: %w", err)
	}

	var inspections []models.Inspection
	var total int64

	query := r.db.Where("organization_id = ? AND inspector_id = ?", organizationID, inspectorID)

	// Count total
	err = query.Model(&models.Inspection{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err = query.
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Preload("InspectionData").
		Preload("Attachments").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&inspections).Error

	if err != nil {
		return nil, 0, err
	}

	return inspections, total, nil
}

// GetByStatus retrieves inspections by status within tenant scope
func (r *InspectionRepositoryImpl) GetByStatus(ctx context.Context, status string, limit, offset int) ([]models.Inspection, int64, error) {
	if r.db == nil {
		return nil, 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("tenant context required: %w", err)
	}

	var inspections []models.Inspection
	var total int64

	query := r.db.Where("organization_id = ? AND status = ?", organizationID, status)

	// Count total
	err = query.Model(&models.Inspection{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err = query.
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Preload("InspectionData").
		Preload("Attachments").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&inspections).Error

	if err != nil {
		return nil, 0, err
	}

	return inspections, total, nil
}

// GetByTemplate retrieves inspections by template within tenant scope
func (r *InspectionRepositoryImpl) GetByTemplate(ctx context.Context, templateID uint, limit, offset int) ([]models.Inspection, int64, error) {
	if r.db == nil {
		return nil, 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("tenant context required: %w", err)
	}

	var inspections []models.Inspection
	var total int64

	query := r.db.Where("organization_id = ? AND template_id = ?", organizationID, templateID)

	// Count total
	err = query.Model(&models.Inspection{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err = query.
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Preload("InspectionData").
		Preload("Attachments").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&inspections).Error

	if err != nil {
		return nil, 0, err
	}

	return inspections, total, nil
}

// GetOverdue retrieves overdue inspections within tenant scope
func (r *InspectionRepositoryImpl) GetOverdue(ctx context.Context, limit, offset int) ([]models.Inspection, int64, error) {
	if r.db == nil {
		return nil, 0, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, 0, fmt.Errorf("tenant context required: %w", err)
	}

	var inspections []models.Inspection
	var total int64

	query := r.db.Where("organization_id = ? AND due_date < ? AND status != ?", organizationID, time.Now(), "completed")

	// Count total
	err = query.Model(&models.Inspection{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err = query.
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Order("due_date ASC").
		Limit(limit).
		Offset(offset).
		Find(&inspections).Error

	if err != nil {
		return nil, 0, err
	}

	return inspections, total, nil
}

// GetDueToday retrieves inspections due today within tenant scope
func (r *InspectionRepositoryImpl) GetDueToday(ctx context.Context) ([]models.Inspection, error) {
	if r.db == nil {
		return nil, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, fmt.Errorf("tenant context required: %w", err)
	}

	var inspections []models.Inspection
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	err = r.db.Where("organization_id = ? AND due_date >= ? AND due_date < ? AND status != ?",
		organizationID, today, tomorrow, "completed").
		Preload("Template").
		Preload("Inspector").
		Preload("Site").
		Order("due_date ASC").
		Find(&inspections).Error

	return inspections, err
}

// UpdateStatus updates inspection status within tenant scope
func (r *InspectionRepositoryImpl) UpdateStatus(ctx context.Context, inspectionID uuid.UUID, status string) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	result := r.db.Model(&models.Inspection{}).
		Where("organization_id = ? AND id = ?", organizationID, inspectionID).
		Update("status", status)

	if result.Error != nil {
		return result.Error
	}

	if result.RowsAffected == 0 {
		return fmt.Errorf("inspection not found in organization scope")
	}

	return nil
}

// Submit submits inspection form data within tenant scope
func (r *InspectionRepositoryImpl) Submit(ctx context.Context, inspectionID uuid.UUID, formData map[string]interface{}) error {
	if r.db == nil {
		return errors.New("database connection not available")
	}

	_, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return fmt.Errorf("tenant context required: %w", err)
	}

	// Verify inspection exists in tenant scope using UUID
	var inspection models.Inspection
	err = r.db.WithContext(ctx).Where("id = ?", inspectionID).First(&inspection).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("inspection not found in organization scope")
		}
		return fmt.Errorf("failed to fetch inspection: %w", err)
	}

	// Store form data in the inspection_data table
	// First, delete existing inspection data for this inspection
	err = r.db.Where("inspection_id = ?", inspection.ID).Delete(&models.InspectionData{}).Error
	if err != nil {
		return fmt.Errorf("failed to clear existing inspection data: %w", err)
	}

	// Insert new form data
	for fieldName, fieldValue := range formData {
		// Convert field value to string
		var fieldValueStr string
		if fieldValue != nil {
			fieldValueStr = fmt.Sprintf("%v", fieldValue)
		}

		inspectionData := models.InspectionData{
			InspectionID: inspection.ID,
			FieldName:    fieldName,
			FieldValue:   fieldValueStr,
		}

		err = r.db.Create(&inspectionData).Error
		if err != nil {
			return fmt.Errorf("failed to save inspection data for field %s: %w", fieldName, err)
		}
	}

	return nil
}

// GetInspectionStats returns inspection statistics within tenant scope
func (r *InspectionRepositoryImpl) GetInspectionStats(ctx context.Context) (map[string]interface{}, error) {
	if r.db == nil {
		return nil, errors.New("database connection not available")
	}

	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, fmt.Errorf("tenant context required: %w", err)
	}

	var stats struct {
		Total      int64 `json:"total"`
		Draft      int64 `json:"draft"`
		InProgress int64 `json:"in_progress"`
		Completed  int64 `json:"completed"`
		Overdue    int64 `json:"overdue"`
	}

	// Use raw SQL for better performance with tenant filtering
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft,
			COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
			COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
			COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END) as overdue
		FROM inspections
		WHERE organization_id = ?
	`

	err = r.db.Raw(query, organizationID).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total":       stats.Total,
		"draft":       stats.Draft,
		"in_progress": stats.InProgress,
		"completed":   stats.Completed,
		"overdue":     stats.Overdue,
	}, nil
}