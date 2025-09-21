package services

import (
	"context"
	"encoding/json"
	"errors"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"resource-mgmt/pkg/tenant"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type TemplateService struct {
	db *gorm.DB
}

func NewTemplateService() *TemplateService {
	return &TemplateService{
		db: config.DB,
	}
}

func (s *TemplateService) GetTemplates(organizationID, category, isActive string, limit, offset int) ([]models.Template, int64, error) {
	var templates []models.Template
	var total int64

	query := s.db.Model(&models.Template{}).Where("organization_id = ?", organizationID)

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if isActive == "true" {
		query = query.Where("is_active = ?", true)
	} else if isActive == "false" {
		query = query.Where("is_active = ?", false)
	}

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&templates).Error

	if err != nil {
		return nil, 0, err
	}

	return templates, total, nil
}

func (s *TemplateService) GetTemplateByID(id uint, organizationID string) (*models.Template, error) {
	var template models.Template

	err := s.db.
		Where("organization_id = ?", organizationID).
		First(&template, id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("template not found")
		}
		return nil, err
	}

	return &template, nil
}

func (s *TemplateService) CreateTemplate(ctx context.Context, req *models.CreateTemplateRequest, userID string) (*models.Template, error) {
	// Get organization ID from tenant context
	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, errors.New("tenant context required")
	}

	// Convert fields schema to JSON
	fieldsSchemaJSON, err := json.Marshal(req.FieldsSchema)
	if err != nil {
		return nil, errors.New("invalid fields schema")
	}

	template := &models.Template{
		OrganizationID:    organizationID,
		Name:              req.Name,
		Description:       req.Description,
		Category:          req.Category,
		FieldsSchema:      datatypes.JSON(fieldsSchemaJSON),
		IsActive:          true,
		CreatedBy:         userID,
		Version:           1,
		IsLatestVersion:   true,
		VersionNotes:      "Initial version",
	}

	err = s.db.Create(template).Error
	if err != nil {
		return nil, err
	}

	// Load relationships
	err = s.db.
		First(template, template.ID).Error

	if err != nil {
		return nil, err
	}

	return template, nil
}

func (s *TemplateService) UpdateTemplate(id uint, req *models.UpdateTemplateRequest) (*models.Template, error) {
	return s.UpdateTemplateWithVersioning(id, req, "Template updated", false)
}

func (s *TemplateService) UpdateTemplateWithVersioning(id uint, req *models.UpdateTemplateRequest, versionNotes string, createNewVersion bool) (*models.Template, error) {
	var template models.Template

	err := s.db.First(&template, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("template not found")
		}
		return nil, err
	}

	// If creating a new version, create a new template record
	if createNewVersion {
		return s.createNewTemplateVersion(&template, req, versionNotes)
	}

	// Otherwise, update the existing template
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Category != "" {
		updates["category"] = req.Category
	}
	if req.FieldsSchema != nil {
		fieldsSchemaJSON, err := json.Marshal(req.FieldsSchema)
		if err != nil {
			return nil, errors.New("invalid fields schema")
		}
		updates["fields_schema"] = datatypes.JSON(fieldsSchemaJSON)
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	err = s.db.Model(&template).Updates(updates).Error
	if err != nil {
		return nil, err
	}

	// Load relationships
	err = s.db.
		First(&template, id).Error

	if err != nil {
		return nil, err
	}

	return &template, nil
}

func (s *TemplateService) createNewTemplateVersion(original *models.Template, req *models.UpdateTemplateRequest, versionNotes string) (*models.Template, error) {
	// Start a transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Mark the current template as not the latest version
	err := tx.Model(original).Update("is_latest_version", false).Error
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create the new version
	newTemplate := &models.Template{
		OrganizationID:    original.OrganizationID,
		Name:              original.Name,
		Description:       original.Description,
		Category:          original.Category,
		FieldsSchema:      original.FieldsSchema,
		IsActive:          original.IsActive,
		CreatedBy:         original.CreatedBy,
		Version:           original.Version + 1,
		ParentTemplateID:  &original.ID,
		IsLatestVersion:   true,
		VersionNotes:      versionNotes,
	}

	// Apply updates to the new version
	if req.Name != "" {
		newTemplate.Name = req.Name
	}
	if req.Description != "" {
		newTemplate.Description = req.Description
	}
	if req.Category != "" {
		newTemplate.Category = req.Category
	}
	if req.FieldsSchema != nil {
		fieldsSchemaJSON, err := json.Marshal(req.FieldsSchema)
		if err != nil {
			tx.Rollback()
			return nil, errors.New("invalid fields schema")
		}
		newTemplate.FieldsSchema = datatypes.JSON(fieldsSchemaJSON)
	}
	if req.IsActive != nil {
		newTemplate.IsActive = *req.IsActive
	}

	err = tx.Create(newTemplate).Error
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit the transaction
	err = tx.Commit().Error
	if err != nil {
		return nil, err
	}

	// Load relationships
	err = s.db.
		First(newTemplate, newTemplate.ID).Error

	if err != nil {
		return nil, err
	}

	return newTemplate, nil
}

func (s *TemplateService) DeleteTemplate(id uint) error {
	var template models.Template

	err := s.db.First(&template, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("template not found")
		}
		return err
	}

	// Check if template is being used by any inspections
	var count int64
	err = s.db.Model(&models.Inspection{}).Where("template_id = ?", id).Count(&count).Error
	if err != nil {
		return err
	}

	if count > 0 {
		return errors.New("cannot delete template: it is being used by existing inspections")
	}

	return s.db.Delete(&template).Error
}

func (s *TemplateService) GetCategories() ([]string, error) {
	var categories []string

	err := s.db.Model(&models.Template{}).
		Distinct("category").
		Where("category != '' AND is_active = ?", true).
		Pluck("category", &categories).Error

	if err != nil {
		return nil, err
	}

	return categories, nil
}

func (s *TemplateService) DuplicateTemplate(id uint, userID string, organizationID string) (*models.Template, error) {
	// Get the original template (with organization filtering)
	original, err := s.GetTemplateByID(id, organizationID)
	if err != nil {
		return nil, err
	}

	// Create a copy with modified name
	duplicateReq := &models.CreateTemplateRequest{
		Name:         original.Name + " (Copy)",
		Description:  original.Description,
		Category:     original.Category,
		FieldsSchema: make(map[string]interface{}),
	}

	// Parse the original fields schema
	err = json.Unmarshal(original.FieldsSchema, &duplicateReq.FieldsSchema)
	if err != nil {
		return nil, errors.New("failed to parse original template schema")
	}

	// Create a background context for the CreateTemplate call
	ctx := context.Background()
	return s.CreateTemplate(ctx, duplicateReq, userID)
}

func (s *TemplateService) ValidateTemplateSchema(schema map[string]interface{}) error {
	// Basic schema validation
	sections, ok := schema["sections"].([]interface{})
	if !ok {
		return errors.New("template schema must have 'sections' array")
	}

	if len(sections) == 0 {
		return errors.New("template must have at least one section")
	}

	for i, section := range sections {
		sectionMap, ok := section.(map[string]interface{})
		if !ok {
			return errors.New("each section must be an object")
		}

		name, ok := sectionMap["name"].(string)
		if !ok || name == "" {
			return errors.New("each section must have a name")
		}

		fields, ok := sectionMap["fields"].([]interface{})
		if !ok {
			return errors.New("each section must have a 'fields' array")
		}

		if len(fields) == 0 {
			return errors.New("each section must have at least one field")
		}

		for _, field := range fields {
			fieldMap, ok := field.(map[string]interface{})
			if !ok {
				return errors.New("each field must be an object")
			}

			fieldName, ok := fieldMap["name"].(string)
			if !ok || fieldName == "" {
				return errors.New("each field must have a name")
			}

			fieldType, ok := fieldMap["type"].(string)
			if !ok || fieldType == "" {
				return errors.New("each field must have a type")
			}

			// Validate field type
			validTypes := []string{"text", "textarea", "number", "email", "phone", "date", "time", "datetime", "select", "radio", "checkbox", "file"}
			isValidType := false
			for _, validType := range validTypes {
				if fieldType == validType {
					isValidType = true
					break
				}
			}

			if !isValidType {
				return errors.New("invalid field type: " + fieldType + " in section " + name + ", field " + fieldName)
			}

			// Validate options for select/radio fields
			if fieldType == "select" || fieldType == "radio" {
				_, hasOptions := fieldMap["options"]
				if !hasOptions {
					return errors.New("select and radio fields must have options")
				}
			}
		}

		_ = i // Suppress unused variable warning
	}

	return nil
}

// GetTemplateVersions returns all versions of a template
func (s *TemplateService) GetTemplateVersions(templateID uint, organizationID string) ([]models.Template, error) {
	var versions []models.Template

	// Get the original template first to find all related versions
	var originalTemplate models.Template
	err := s.db.Where("id = ? AND organization_id = ?", templateID, organizationID).First(&originalTemplate).Error
	if err != nil {
		return nil, errors.New("template not found")
	}

	// Find all versions - either this template's versions or if this is a version, find all related versions
	query := s.db.Where("organization_id = ?", organizationID)

	if originalTemplate.ParentTemplateID != nil {
		// This is a version, so find all versions including the parent
		query = query.Where("id = ? OR parent_template_id = ?", *originalTemplate.ParentTemplateID, *originalTemplate.ParentTemplateID)
	} else {
		// This is the original, so find all its versions
		query = query.Where("id = ? OR parent_template_id = ?", templateID, templateID)
	}

	err = query.
		Order("version DESC").
		Find(&versions).Error

	return versions, err
}

// GetLatestTemplateVersion returns the latest version of a template
func (s *TemplateService) GetLatestTemplateVersion(templateID uint, organizationID string) (*models.Template, error) {
	var template models.Template

	// First try to find if this ID is already the latest version
	err := s.db.Where("id = ? AND organization_id = ? AND is_latest_version = ?", templateID, organizationID, true).First(&template).Error
	if err == nil {
		return &template, nil
	}

	// If not, find the latest version by following the chain
	var originalTemplate models.Template
	err = s.db.Where("id = ? AND organization_id = ?", templateID, organizationID).First(&originalTemplate).Error
	if err != nil {
		return nil, errors.New("template not found")
	}

	query := s.db.Where("organization_id = ? AND is_latest_version = ?", organizationID, true)

	if originalTemplate.ParentTemplateID != nil {
		// This is a version, find the latest version of the parent
		query = query.Where("parent_template_id = ?", *originalTemplate.ParentTemplateID)
	} else {
		// This is the original, find its latest version or itself
		query = query.Where("id = ? OR parent_template_id = ?", templateID, templateID)
	}

	err = query.
		First(&template).Error

	if err != nil {
		return nil, errors.New("latest version not found")
	}

	return &template, nil
}

// GetTemplateByVersion returns a specific version of a template
func (s *TemplateService) GetTemplateByVersion(templateID uint, version int, organizationID string) (*models.Template, error) {
	var template models.Template

	// Get the original template to understand the version chain
	var originalTemplate models.Template
	err := s.db.Where("id = ? AND organization_id = ?", templateID, organizationID).First(&originalTemplate).Error
	if err != nil {
		return nil, errors.New("template not found")
	}

	query := s.db.Where("organization_id = ? AND version = ?", organizationID, version)

	if originalTemplate.ParentTemplateID != nil {
		// This is a version, find the specific version of the parent
		query = query.Where("parent_template_id = ?", *originalTemplate.ParentTemplateID)
	} else {
		// This is the original, find the specific version
		query = query.Where("id = ? OR parent_template_id = ?", templateID, templateID)
	}

	err = query.
		First(&template).Error

	if err != nil {
		return nil, errors.New("template version not found")
	}

	return &template, nil
}

// GetLatestTemplateVersionUUID returns the latest version of a template by UUID
func (s *TemplateService) GetLatestTemplateVersionUUID(templateID uuid.UUID, organizationID string) (*models.Template, error) {
	var template models.Template

	// First try to find if this ID is already the latest version
	err := s.db.Where("id = ? AND organization_id = ? AND is_latest_version = ?", templateID, organizationID, true).First(&template).Error
	if err == nil {
		return &template, nil
	}

	// If not, find the latest version by following the chain
	var originalTemplate models.Template
	err = s.db.Where("id = ? AND organization_id = ?", templateID, organizationID).First(&originalTemplate).Error
	if err != nil {
		return nil, errors.New("template not found")
	}

	query := s.db.Where("organization_id = ? AND is_latest_version = ?", organizationID, true)

	if originalTemplate.ParentTemplateID != nil {
		// This is a version, find the latest version of the parent
		query = query.Where("parent_template_id = ?", *originalTemplate.ParentTemplateID)
	} else {
		// This is the original, find its latest version or itself
		query = query.Where("id = ? OR parent_template_id = ?", templateID, templateID)
	}

	err = query.First(&template).Error
	if err != nil {
		return nil, errors.New("latest version not found")
	}

	return &template, nil
}

// GetTemplateByVersionUUID returns a specific version of a template by UUID
func (s *TemplateService) GetTemplateByVersionUUID(templateID uuid.UUID, version int, organizationID string) (*models.Template, error) {
	var template models.Template

	// Get the original template to understand the version chain
	var originalTemplate models.Template
	err := s.db.Where("id = ? AND organization_id = ?", templateID, organizationID).First(&originalTemplate).Error
	if err != nil {
		return nil, errors.New("template not found")
	}

	query := s.db.Where("organization_id = ? AND version = ?", organizationID, version)

	if originalTemplate.ParentTemplateID != nil {
		// This is a version, find the specific version of the parent
		query = query.Where("parent_template_id = ?", *originalTemplate.ParentTemplateID)
	} else {
		// This is the original, find the specific version
		query = query.Where("id = ? OR parent_template_id = ?", templateID, templateID)
	}

	err = query.First(&template).Error
	if err != nil {
		return nil, errors.New("template version not found")
	}

	return &template, nil
}

// GetTemplateByUUID returns a template by UUID
func (s *TemplateService) GetTemplateByUUID(templateID uuid.UUID, organizationID string) (*models.Template, error) {
	var template models.Template
	err := s.db.Where("id = ? AND organization_id = ?", templateID, organizationID).First(&template).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("template not found")
		}
		return nil, err
	}
	return &template, nil
}

// UpdateTemplateByUUID updates a template by UUID
func (s *TemplateService) UpdateTemplateByUUID(templateID uuid.UUID, req *models.UpdateTemplateRequest) (*models.Template, error) {
	var template models.Template
	err := s.db.Where("id = ?", templateID).First(&template).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("template not found")
		}
		return nil, err
	}

	// Update fields
	if req.Name != "" {
		template.Name = req.Name
	}
	if req.Description != "" {
		template.Description = req.Description
	}
	if req.Category != "" {
		template.Category = req.Category
	}
	if req.FieldsSchema != nil {
		schemaJSON, err := json.Marshal(req.FieldsSchema)
		if err != nil {
			return nil, err
		}
		template.FieldsSchema = datatypes.JSON(schemaJSON)
	}
	if req.IsActive != nil {
		template.IsActive = *req.IsActive
	}

	err = s.db.Save(&template).Error
	if err != nil {
		return nil, err
	}

	return &template, nil
}

// DeleteTemplateByUUID deletes a template by UUID
func (s *TemplateService) DeleteTemplateByUUID(templateID uuid.UUID) error {
	var template models.Template
	err := s.db.Where("id = ?", templateID).First(&template).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("template not found")
		}
		return err
	}

	// Check if template is being used by any inspections
	var count int64
	err = s.db.Model(&models.Inspection{}).Where("template_id = ?", templateID).Count(&count).Error
	if err != nil {
		return err
	}

	if count > 0 {
		return errors.New("cannot delete template: it is being used by existing inspections")
	}

	return s.db.Delete(&template).Error
}

// GetTemplateVersionsByUUID returns all versions of a template by UUID
func (s *TemplateService) GetTemplateVersionsByUUID(templateID uuid.UUID, organizationID string) ([]models.Template, error) {
	var versions []models.Template

	// Get the original template first to find all related versions
	var originalTemplate models.Template
	err := s.db.Where("id = ? AND organization_id = ?", templateID, organizationID).First(&originalTemplate).Error
	if err != nil {
		return nil, errors.New("template not found")
	}

	// Find all versions - either this template's versions or if this is a version, find all related versions
	query := s.db.Where("organization_id = ?", organizationID)

	if originalTemplate.ParentTemplateID != nil {
		// This is a version, so find all versions including the parent
		query = query.Where("id = ? OR parent_template_id = ?", *originalTemplate.ParentTemplateID, *originalTemplate.ParentTemplateID)
	} else {
		// This is the original, so find all its versions
		query = query.Where("id = ? OR parent_template_id = ?", templateID, templateID)
	}

	err = query.
		Order("version DESC").
		Find(&versions).Error

	return versions, err
}

// UpdateTemplateWithVersioningByUUID creates a new version of a template by UUID
func (s *TemplateService) UpdateTemplateWithVersioningByUUID(templateID uuid.UUID, req *models.UpdateTemplateRequest, versionNotes string, createNewVersion bool) (*models.Template, error) {
	// Get the original template
	originalTemplate, err := s.GetTemplateByUUID(templateID, "")
	if err != nil {
		return nil, err
	}

	if !createNewVersion {
		// Just update the existing template
		return s.UpdateTemplateByUUID(templateID, req)
	}

	// Create new version
	newTemplate := models.Template{
		ID:               uuid.New(),
		Name:             req.Name,
		Description:      req.Description,
		Category:         req.Category,
		OrganizationID:   originalTemplate.OrganizationID,
		CreatedBy:        originalTemplate.CreatedBy,
		Version:          originalTemplate.Version + 1,
		ParentTemplateID: &originalTemplate.ID,
		IsLatestVersion:  true,
		VersionNotes:     versionNotes,
		IsActive:         true,
	}

	if req.FieldsSchema != nil {
		schemaJSON, err := json.Marshal(req.FieldsSchema)
		if err != nil {
			return nil, err
		}
		newTemplate.FieldsSchema = datatypes.JSON(schemaJSON)
	} else {
		newTemplate.FieldsSchema = originalTemplate.FieldsSchema
	}

	// Start transaction
	tx := s.db.Begin()

	// Mark all previous versions as not latest
	err = tx.Model(&models.Template{}).
		Where("id = ? OR parent_template_id = ?", originalTemplate.ID, originalTemplate.ID).
		Update("is_latest_version", false).Error
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create the new version
	err = tx.Create(&newTemplate).Error
	if err != nil {
		tx.Rollback()
		return nil, err
	}

	tx.Commit()
	return &newTemplate, nil
}

// DuplicateTemplateByUUID duplicates a template by UUID
func (s *TemplateService) DuplicateTemplateByUUID(templateID uuid.UUID, userID string, organizationID string) (*models.Template, error) {
	// Get the original template (with organization filtering)
	original, err := s.GetTemplateByUUID(templateID, organizationID)
	if err != nil {
		return nil, err
	}

	// Create a copy with modified name
	duplicateReq := &models.CreateTemplateRequest{
		Name:         original.Name + " (Copy)",
		Description:  original.Description,
		Category:     original.Category,
		FieldsSchema: make(map[string]interface{}),
	}

	// Parse the original fields schema
	err = json.Unmarshal(original.FieldsSchema, &duplicateReq.FieldsSchema)
	if err != nil {
		return nil, errors.New("failed to parse original template schema")
	}

	// Create a background context for the CreateTemplate call
	ctx := context.Background()
	return s.CreateTemplate(ctx, duplicateReq, userID)
}
