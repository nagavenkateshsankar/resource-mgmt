package services

import (
	"context"
	"errors"
	"resource-mgmt/models"
	"resource-mgmt/pkg/repository"
	"resource-mgmt/pkg/tenant"
	"time"

	"github.com/google/uuid"
)

type InspectionService struct {
	inspectionRepo repository.InspectionRepository
}

func NewInspectionService(repoManager *repository.RepositoryManager) *InspectionService {
	return &InspectionService{
		inspectionRepo: repoManager.Inspections(),
	}
}

func (s *InspectionService) GetInspections(ctx context.Context, inspectorID, status string, limit, offset int) ([]models.Inspection, int64, error) {
	filters := make(map[string]interface{})

	if inspectorID != "" {
		filters["inspector_id"] = inspectorID
	}
	if status != "" {
		filters["status"] = status
	}

	return s.inspectionRepo.GetAll(ctx, filters, limit, offset)
}

func (s *InspectionService) GetInspectionByID(ctx context.Context, id uint) (*models.Inspection, error) {
	return s.inspectionRepo.GetByID(ctx, id)
}

func (s *InspectionService) GetInspectionWithTemplateVersion(ctx context.Context, id uint) (*models.Inspection, *models.Template, error) {
	// Get the inspection
	inspection, err := s.inspectionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, nil, err
	}

	// Get organization from tenant context
	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, nil, errors.New("tenant context required")
	}

	// Get the specific template version used for this inspection
	templateService := NewTemplateService()
	template, err := templateService.GetTemplateByVersionUUID(inspection.TemplateID, inspection.TemplateVersion, organizationID)
	if err != nil {
		return nil, nil, errors.New("template version not found")
	}

	return inspection, template, nil
}

func (s *InspectionService) CreateInspection(ctx context.Context, req *models.CreateInspectionRequest) (*models.Inspection, error) {
	// Get organization from tenant context
	organizationID, err := tenant.GetOrganizationID(ctx)
	if err != nil {
		return nil, errors.New("tenant context required for inspection creation")
	}

	// Get the latest version of the template to capture the version
	templateService := NewTemplateService()
	template, err := templateService.GetLatestTemplateVersionUUID(req.TemplateID, organizationID)
	if err != nil {
		return nil, errors.New("template not found or inaccessible")
	}

	inspection := &models.Inspection{
		OrganizationID:  organizationID, // Always use tenant context
		TemplateID:      req.TemplateID,
		TemplateVersion: template.Version,
		InspectorID:     req.InspectorID,
		AssignedBy:      req.AssignedBy,
		SiteID:          req.SiteID,
		Status:          "draft",
		Priority:        req.Priority,
		ScheduledFor:    req.ScheduledFor,
		DueDate:         req.DueDate,
		Notes:           req.Notes,
	}

	if req.Status != "" {
		inspection.Status = req.Status
	}

	if inspection.Priority == "" {
		inspection.Priority = "medium"
	}

	err = s.inspectionRepo.Create(ctx, inspection)
	if err != nil {
		return nil, err
	}

	// Return the created inspection with relationships loaded
	return s.inspectionRepo.GetByUUID(ctx, inspection.ID)
}

func (s *InspectionService) UpdateInspection(ctx context.Context, id uint, req *models.UpdateInspectionRequest) (*models.Inspection, error) {
	// First ensure inspection exists in tenant scope
	_, err := s.inspectionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	updates := make(map[string]interface{})

	if req.SiteID != "" {
		updates["site_id"] = req.SiteID
	}
	if req.Status != "" {
		updates["status"] = req.Status
		if req.Status == "completed" {
			now := time.Now()
			updates["completed_at"] = &now
		}
	}
	if req.Priority != "" {
		updates["priority"] = req.Priority
	}
	if req.DueDate != nil {
		updates["due_date"] = req.DueDate
	}
	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	err = s.inspectionRepo.Update(ctx, id, updates)
	if err != nil {
		return nil, err
	}

	// Return the updated inspection
	return s.inspectionRepo.GetByID(ctx, id)
}

func (s *InspectionService) DeleteInspection(ctx context.Context, id uint) error {
	return s.inspectionRepo.Delete(ctx, id)
}

func (s *InspectionService) SubmitInspection(ctx context.Context, id uuid.UUID, req *models.SubmitInspectionRequest) (*models.Inspection, error) {
	// Use the Submit method from repository for form data
	err := s.inspectionRepo.Submit(ctx, id, req.FormData)
	if err != nil {
		return nil, err
	}

	// Return a basic inspection response for now
	return &models.Inspection{ID: id}, nil
}


func (s *InspectionService) GetInspectionStats(ctx context.Context) (map[string]interface{}, error) {
	return s.inspectionRepo.GetInspectionStats(ctx)
}

func (s *InspectionService) StartInspection(ctx context.Context, id uint) (*models.Inspection, error) {
	inspection, err := s.inspectionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if inspection.Status != "draft" {
		return nil, errors.New("can only start inspections in draft status")
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":     "in_progress",
		"started_at": &now,
	}

	err = s.inspectionRepo.Update(ctx, id, updates)
	if err != nil {
		return nil, err
	}

	return s.GetInspectionByID(ctx, id)
}

func (s *InspectionService) CompleteInspection(ctx context.Context, id uint) (*models.Inspection, error) {
	inspection, err := s.inspectionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if inspection.Status == "completed" {
		return nil, errors.New("inspection is already completed")
	}

	now := time.Now()
	updates := map[string]interface{}{
		"status":       "completed",
		"completed_at": &now,
	}

	if inspection.StartedAt == nil {
		updates["started_at"] = &now
	}

	err = s.inspectionRepo.Update(ctx, id, updates)
	if err != nil {
		return nil, err
	}

	return s.GetInspectionByID(ctx, id)
}

func (s *InspectionService) GetOverdueInspections(ctx context.Context, limit, offset int) ([]models.Inspection, int64, error) {
	return s.inspectionRepo.GetOverdue(ctx, limit, offset)
}

func (s *InspectionService) GetInspectionsByTemplate(ctx context.Context, templateID uint, limit, offset int) ([]models.Inspection, int64, error) {
	return s.inspectionRepo.GetByTemplate(ctx, templateID, limit, offset)
}

func (s *InspectionService) AssignInspection(ctx context.Context, id uint, req *models.AssignInspectionRequest) (*models.Inspection, error) {
	// First ensure inspection exists in tenant scope
	_, err := s.inspectionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{
		"inspector_id": req.InspectorID,
		"assigned_by":  req.AssignedBy,
		"status":       "assigned",
	}

	if req.DueDate != nil {
		updates["due_date"] = req.DueDate
	}

	if req.ScheduledFor != nil {
		updates["scheduled_for"] = req.ScheduledFor
	}

	if req.Priority != "" {
		updates["priority"] = req.Priority
	}

	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	err = s.inspectionRepo.Update(ctx, id, updates)
	if err != nil {
		return nil, err
	}

	return s.GetInspectionByID(ctx, id)
}

func (s *InspectionService) UpdateInspectionStatus(ctx context.Context, id uint, req *models.UpdateInspectionStatusRequest) (*models.Inspection, error) {
	inspection, err := s.inspectionRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	// Validate status transitions
	if !s.isValidStatusTransition(inspection.Status, req.Status) {
		return nil, errors.New("invalid status transition")
	}

	updates := map[string]interface{}{
		"status": req.Status,
	}

	if req.Notes != "" {
		updates["notes"] = req.Notes
	}

	now := time.Now()

	// Set timestamps based on status
	switch req.Status {
	case "in_progress":
		if inspection.StartedAt == nil {
			updates["started_at"] = &now
		}
	case "completed":
		if inspection.CompletedAt == nil {
			updates["completed_at"] = &now
		}
		if inspection.StartedAt == nil {
			updates["started_at"] = &now
		}
	}

	err = s.inspectionRepo.Update(ctx, id, updates)
	if err != nil {
		return nil, err
	}

	return s.GetInspectionByID(ctx, id)
}

func (s *InspectionService) isValidStatusTransition(currentStatus, newStatus string) bool {
	validTransitions := map[string][]string{
		"draft":       {"assigned", "in_progress", "completed"},
		"assigned":    {"in_progress", "draft", "completed"},
		"in_progress": {"completed", "assigned"},
		"completed":   {"assigned"}, // Allow reopening completed inspections
	}

	allowedStatuses, exists := validTransitions[currentStatus]
	if !exists {
		return false
	}

	for _, status := range allowedStatuses {
		if status == newStatus {
			return true
		}
	}

	return false
}

// getFieldType determines the type of a field value
func getFieldType(value interface{}) string {
	switch value.(type) {
	case bool:
		return "boolean"
	case int, int8, int16, int32, int64, uint, uint8, uint16, uint32, uint64:
		return "number"
	case float32, float64:
		return "number"
	case string:
		return "text"
	case []interface{}:
		return "array"
	case map[string]interface{}:
		return "object"
	default:
		return "text"
	}
}
