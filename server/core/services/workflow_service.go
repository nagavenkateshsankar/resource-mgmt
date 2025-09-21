package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"resource-mgmt/models"
	"resource-mgmt/utils"
)

type WorkflowService struct {
	db                  *gorm.DB
	notificationService *NotificationService
}

func NewWorkflowService(db *gorm.DB, notificationService *NotificationService) *WorkflowService {
	return &WorkflowService{
		db:                  db,
		notificationService: notificationService,
	}
}

// =====================================================
// INSPECTION PROJECTS
// =====================================================

type ProjectFilters struct {
	Status    string
	Priority  string
	Type      string
	ManagerID string
	Search    string
	Page      int
	Limit     int
}

func (s *WorkflowService) CreateInspectionProject(orgID, userID string, req interface{}) (*models.InspectionProject, error) {
	// Convert request to proper structure
	reqData, _ := json.Marshal(req)
	var projectReq struct {
		Name                  string                 `json:"name"`
		Description           string                 `json:"description"`
		Type                  string                 `json:"type"`
		Priority              string                 `json:"priority"`
		ProjectCode           string                 `json:"project_code"`
		StartDate             *time.Time             `json:"start_date"`
		EndDate               *time.Time             `json:"end_date"`
		DueDate               *time.Time             `json:"due_date"`
		ProjectManager        string                 `json:"project_manager"`
		RequiresApproval      bool                   `json:"requires_approval"`
		AutoAssignInspectors  bool                   `json:"auto_assign_inspectors"`
		AllowSelfAssignment   bool                   `json:"allow_self_assignment"`
		MaxInspectorsPerSite  int                    `json:"max_inspectors_per_site"`
		NotificationSettings  map[string]interface{} `json:"notification_settings"`
		Metadata              map[string]interface{} `json:"metadata"`
		Tags                  []string               `json:"tags"`
	}
	json.Unmarshal(reqData, &projectReq)

	// Validate project manager exists and belongs to organization
	var manager models.OrganizationMember
	if err := s.db.Where("user_id = ? AND organization_id = ? AND status = 'active'",
		projectReq.ProjectManager, orgID).First(&manager).Error; err != nil {
		return nil, errors.New("invalid project manager")
	}

	// Validate project manager has sufficient privileges
	if !utils.HasHigherOrEqualPrivilege(manager.Role, "supervisor") {
		return nil, errors.New("project manager must have supervisor or admin role")
	}

	// Set defaults
	if projectReq.Type == "" {
		projectReq.Type = "regular"
	}
	if projectReq.Priority == "" {
		projectReq.Priority = "medium"
	}
	if projectReq.MaxInspectorsPerSite == 0 {
		projectReq.MaxInspectorsPerSite = 1
	}

	// Convert notification settings and metadata to JSON
	notificationSettingsJSON, _ := json.Marshal(projectReq.NotificationSettings)
	metadataJSON, _ := json.Marshal(projectReq.Metadata)
	tagsJSON, _ := json.Marshal(projectReq.Tags)

	project := &models.InspectionProject{
		OrganizationID:        orgID,
		Name:                  projectReq.Name,
		Description:           projectReq.Description,
		Type:                  projectReq.Type,
		Priority:              projectReq.Priority,
		ProjectCode:           projectReq.ProjectCode,
		StartDate:             projectReq.StartDate,
		EndDate:               projectReq.EndDate,
		DueDate:               projectReq.DueDate,
		ProjectManager:        projectReq.ProjectManager,
		CreatedBy:             userID,
		RequiresApproval:      projectReq.RequiresApproval,
		AutoAssignInspectors:  projectReq.AutoAssignInspectors,
		AllowSelfAssignment:   projectReq.AllowSelfAssignment,
		MaxInspectorsPerSite:  projectReq.MaxInspectorsPerSite,
		NotificationSettings:  datatypes.JSON(notificationSettingsJSON),
		Metadata:              datatypes.JSON(metadataJSON),
		Tags:                  datatypes.JSON(tagsJSON),
	}

	if err := s.db.Create(project).Error; err != nil {
		return nil, fmt.Errorf("failed to create project: %v", err)
	}

	// Load relationships
	s.db.Preload("Manager").Preload("Creator").First(project, project.ID)

	// Send notification to project manager
	if projectReq.ProjectManager != userID {
		s.notificationService.CreateNotification(&models.CreateNotificationRequest{
			OrganizationID: orgID,
			UserID:         projectReq.ProjectManager,
			Title:          "New Project Assignment",
			Message:        fmt.Sprintf("You have been assigned as project manager for '%s'", project.Name),
		})
	}

	return project, nil
}

func (s *WorkflowService) GetInspectionProjects(orgID string, filters ProjectFilters) ([]models.InspectionProject, int64, error) {
	var projects []models.InspectionProject
	var total int64

	query := s.db.Where("organization_id = ?", orgID)

	// Apply filters
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.Priority != "" {
		query = query.Where("priority = ?", filters.Priority)
	}
	if filters.Type != "" {
		query = query.Where("type = ?", filters.Type)
	}
	if filters.ManagerID != "" {
		query = query.Where("project_manager = ?", filters.ManagerID)
	}
	if filters.Search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ? OR project_code ILIKE ?",
			"%"+filters.Search+"%", "%"+filters.Search+"%", "%"+filters.Search+"%")
	}

	// Count total
	query.Model(&models.InspectionProject{}).Count(&total)

	// Apply pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.Offset(offset).Limit(filters.Limit)

	// Load with relationships
	if err := query.Preload("Manager").Preload("Creator").
		Order("created_at DESC").Find(&projects).Error; err != nil {
		return nil, 0, err
	}

	return projects, total, nil
}

func (s *WorkflowService) GetInspectionProject(orgID, projectID string) (*models.InspectionProject, error) {
	var project models.InspectionProject
	if err := s.db.Where("organization_id = ? AND id = ?", orgID, projectID).
		Preload("Manager").Preload("Creator").Preload("WorkflowSteps").
		First(&project).Error; err != nil {
		return nil, err
	}
	return &project, nil
}

func (s *WorkflowService) UpdateInspectionProject(orgID, projectID, userID string, req interface{}) (*models.InspectionProject, error) {
	var project models.InspectionProject
	if err := s.db.Where("organization_id = ? AND id = ?", orgID, projectID).
		First(&project).Error; err != nil {
		return nil, err
	}

	// Convert request to proper structure and update fields
	reqData, _ := json.Marshal(req)
	var updateReq map[string]interface{}
	json.Unmarshal(reqData, &updateReq)

	// Validate project manager if being updated
	if newManager, exists := updateReq["project_manager"]; exists {
		var manager models.OrganizationMember
		if err := s.db.Where("user_id = ? AND organization_id = ? AND status = 'active'",
			newManager, orgID).First(&manager).Error; err != nil {
			return nil, errors.New("invalid project manager")
		}
		if !utils.HasHigherOrEqualPrivilege(manager.Role, "supervisor") {
			return nil, errors.New("project manager must have supervisor or admin role")
		}
	}

	updateReq["updated_by"] = userID
	updateReq["updated_at"] = time.Now()

	if err := s.db.Model(&project).Updates(updateReq).Error; err != nil {
		return nil, fmt.Errorf("failed to update project: %v", err)
	}

	// Reload with relationships
	s.db.Where("id = ?", projectID).Preload("Manager").Preload("Creator").First(&project)

	return &project, nil
}

func (s *WorkflowService) DeleteInspectionProject(orgID, projectID string) error {
	result := s.db.Where("organization_id = ? AND id = ?", orgID, projectID).
		Delete(&models.InspectionProject{})

	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// =====================================================
// INSPECTION ASSIGNMENTS
// =====================================================

type AssignmentFilters struct {
	Status     string
	Priority   string
	AssignedTo string
	ProjectID  string
	Search     string
	Overdue    bool
	Page       int
	Limit      int
}

func (s *WorkflowService) CreateBulkAssignment(orgID, userID string, req interface{}) ([]models.InspectionAssignment, error) {
	// Convert request to proper structure
	reqData, _ := json.Marshal(req)
	var assignmentReq struct {
		Name                 string                      `json:"name"`
		Description          string                      `json:"description"`
		ProjectID            *string                     `json:"project_id"`
		Priority             string                      `json:"priority"`
		TemplateID           string                      `json:"template_id"`
		SiteIDs              []string                    `json:"site_ids"`
		InspectorAssignments []map[string]interface{}    `json:"inspector_assignments"`
		StartDate            *time.Time                  `json:"start_date"`
		DueDate              *time.Time                  `json:"due_date"`
		EstimatedHours       int                         `json:"estimated_hours"`
		Instructions         string                      `json:"instructions"`
		RequiresAcceptance   bool                        `json:"requires_acceptance"`
		AllowReassignment    bool                        `json:"allow_reassignment"`
		NotifyOnOverdue      bool                        `json:"notify_on_overdue"`
		Metadata             map[string]interface{}      `json:"metadata"`
	}
	json.Unmarshal(reqData, &assignmentReq)

	// Validate template exists and belongs to organization
	var template models.Template
	if err := s.db.Where("id = ? AND organization_id = ?", assignmentReq.TemplateID, orgID).
		First(&template).Error; err != nil {
		return nil, errors.New("invalid template")
	}

	// Validate sites exist and belong to organization
	var sites []models.Site
	if err := s.db.Where("id IN ? AND organization_id = ?", assignmentReq.SiteIDs, orgID).
		Find(&sites).Error; err != nil {
		return nil, errors.New("invalid sites")
	}
	if len(sites) != len(assignmentReq.SiteIDs) {
		return nil, errors.New("some sites not found or don't belong to organization")
	}

	// Validate inspectors
	for _, assignment := range assignmentReq.InspectorAssignments {
		inspectorID := assignment["inspector_id"].(string)
		var member models.OrganizationMember
		if err := s.db.Where("user_id = ? AND organization_id = ? AND status = 'active'",
			inspectorID, orgID).First(&member).Error; err != nil {
			return nil, fmt.Errorf("invalid inspector: %s", inspectorID)
		}
		if !utils.HasHigherOrEqualPrivilege(member.Role, "inspector") {
			return nil, fmt.Errorf("user %s does not have inspector privileges", inspectorID)
		}
	}

	// Set defaults
	if assignmentReq.Priority == "" {
		assignmentReq.Priority = "medium"
	}
	if assignmentReq.EstimatedHours == 0 {
		assignmentReq.EstimatedHours = 4
	}

	batchID := uuid.New().String()
	var assignments []models.InspectionAssignment

	// Create assignments for each inspector
	for _, assignment := range assignmentReq.InspectorAssignments {
		inspectorID := assignment["inspector_id"].(string)
		inspectorSiteIDs := assignment["site_ids"].([]interface{})

		// Convert site IDs to strings
		var siteIDsForInspector []string
		for _, siteID := range inspectorSiteIDs {
			siteIDsForInspector = append(siteIDsForInspector, siteID.(string))
		}

		siteIDsJSON, _ := json.Marshal(siteIDsForInspector)
		metadataJSON, _ := json.Marshal(assignmentReq.Metadata)

		inspectorAssignment := models.InspectionAssignment{
			OrganizationID:     orgID,
			ProjectID:          assignmentReq.ProjectID,
			BatchID:            batchID,
			Name:               fmt.Sprintf("%s - %s", assignmentReq.Name, inspectorID),
			Description:        assignmentReq.Description,
			AssignmentType:     "bulk",
			Priority:           assignmentReq.Priority,
			AssignedBy:         userID,
			AssignedTo:         inspectorID,
			StartDate:          assignmentReq.StartDate,
			DueDate:            assignmentReq.DueDate,
			EstimatedHours:     assignmentReq.EstimatedHours,
			RequiresAcceptance: assignmentReq.RequiresAcceptance,
			AllowReassignment:  assignmentReq.AllowReassignment,
			NotifyOnOverdue:    assignmentReq.NotifyOnOverdue,
			SiteIDs:            datatypes.JSON(siteIDsJSON),
			TemplateID:         assignmentReq.TemplateID,
			Instructions:       assignmentReq.Instructions,
			Metadata:           datatypes.JSON(metadataJSON),
		}

		if err := s.db.Create(&inspectorAssignment).Error; err != nil {
			return nil, fmt.Errorf("failed to create assignment for inspector %s: %v", inspectorID, err)
		}

		assignments = append(assignments, inspectorAssignment)

		// Create individual inspections for each site
		for _, siteID := range siteIDsForInspector {
			inspection := models.Inspection{
				OrganizationID:  orgID,
				TemplateID:      uuid.MustParse(assignmentReq.TemplateID),
				TemplateVersion: template.Version,
				InspectorID:     inspectorID,
				AssignedBy:      &userID,
				AssignmentID:    &inspectorAssignment.ID,
				SiteID:          siteID,
				Status:          "assigned",
				Priority:        assignmentReq.Priority,
				ScheduledFor:    assignmentReq.StartDate,
				DueDate:         assignmentReq.DueDate,
			}

			if err := s.db.Create(&inspection).Error; err != nil {
				return nil, fmt.Errorf("failed to create inspection for site %s: %v", siteID, err)
			}
		}

		// Send notification to inspector
		s.notificationService.CreateNotification(&models.CreateNotificationRequest{
			OrganizationID: orgID,
			UserID:         inspectorID,
			Title:          "New Inspection Assignment",
			Message:        fmt.Sprintf("You have been assigned %d inspections for '%s'", len(siteIDsForInspector), assignmentReq.Name),
		})
	}

	// Update inspector workloads
	for _, assignment := range assignmentReq.InspectorAssignments {
		inspectorID := assignment["inspector_id"].(string)
		s.updateInspectorWorkload(orgID, inspectorID)
	}

	return assignments, nil
}

func (s *WorkflowService) GetInspectionAssignments(orgID, userID string, filters AssignmentFilters) ([]models.InspectionAssignment, int64, error) {
	var assignments []models.InspectionAssignment
	var total int64

	query := s.db.Where("organization_id = ?", orgID)

	// Check user permissions - inspectors see only their assignments
	var userMember models.OrganizationMember
	if err := s.db.Where("user_id = ? AND organization_id = ?", userID, orgID).First(&userMember).Error; err != nil {
		return nil, 0, errors.New("user not found in organization")
	}

	if userMember.Role == "inspector" {
		query = query.Where("assigned_to = ?", userID)
	}

	// Apply filters
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}
	if filters.Priority != "" {
		query = query.Where("priority = ?", filters.Priority)
	}
	if filters.AssignedTo != "" && userMember.Role != "inspector" {
		query = query.Where("assigned_to = ?", filters.AssignedTo)
	}
	if filters.ProjectID != "" {
		query = query.Where("project_id = ?", filters.ProjectID)
	}
	if filters.Search != "" {
		query = query.Where("name ILIKE ? OR description ILIKE ?", "%"+filters.Search+"%", "%"+filters.Search+"%")
	}
	if filters.Overdue {
		query = query.Where("due_date < ? AND status != 'completed'", time.Now())
	}

	// Count total
	query.Model(&models.InspectionAssignment{}).Count(&total)

	// Apply pagination
	offset := (filters.Page - 1) * filters.Limit
	query = query.Offset(offset).Limit(filters.Limit)

	// Load with relationships
	if err := query.Preload("Assigner").Preload("Inspector").Preload("Project").Preload("Template").
		Order("created_at DESC").Find(&assignments).Error; err != nil {
		return nil, 0, err
	}

	// Populate site names for each assignment
	for i := range assignments {
		err := s.populateSiteNames(&assignments[i])
		if err != nil {
			// Log error but don't fail the whole request
			continue
		}
	}

	return assignments, total, nil
}

func (s *WorkflowService) GetInspectionAssignment(orgID, assignmentID string) (*models.InspectionAssignment, error) {
	var assignment models.InspectionAssignment
	if err := s.db.Where("organization_id = ? AND id = ?", orgID, assignmentID).
		Preload("Assigner").Preload("Inspector").Preload("Project").Preload("Template").
		First(&assignment).Error; err != nil {
		return nil, err
	}
	return &assignment, nil
}

func (s *WorkflowService) AcceptAssignment(orgID, assignmentID, userID string) (*models.InspectionAssignment, error) {
	var assignment models.InspectionAssignment
	if err := s.db.Where("organization_id = ? AND id = ? AND assigned_to = ? AND status = 'pending'",
		orgID, assignmentID, userID).First(&assignment).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	assignment.Status = "active"
	assignment.AcceptedAt = &now

	if err := s.db.Save(&assignment).Error; err != nil {
		return nil, err
	}

	// Update related inspections
	s.db.Model(&models.Inspection{}).Where("assignment_id = ?", assignmentID).
		Updates(map[string]interface{}{
			"status":     "assigned",
			"updated_at": now,
		})

	return &assignment, nil
}

func (s *WorkflowService) RejectAssignment(orgID, assignmentID, userID, reason string) (*models.InspectionAssignment, error) {
	var assignment models.InspectionAssignment
	if err := s.db.Where("organization_id = ? AND id = ? AND assigned_to = ?",
		orgID, assignmentID, userID).First(&assignment).Error; err != nil {
		return nil, err
	}

	assignment.Status = "rejected"
	// Add rejection reason to metadata
	metadata := make(map[string]interface{})
	if assignment.Metadata != nil {
		json.Unmarshal(assignment.Metadata, &metadata)
	}
	metadata["rejection_reason"] = reason
	metadata["rejected_at"] = time.Now()
	metadataJSON, _ := json.Marshal(metadata)
	assignment.Metadata = datatypes.JSON(metadataJSON)

	if err := s.db.Save(&assignment).Error; err != nil {
		return nil, err
	}

	// Notify assigner
	s.notificationService.CreateNotification(&models.CreateNotificationRequest{
		OrganizationID: orgID,
		UserID:         assignment.AssignedBy,
		Title:          "Assignment Rejected",
		Message:        fmt.Sprintf("Assignment '%s' was rejected by inspector. Reason: %s", assignment.Name, reason),
	})

	return &assignment, nil
}

func (s *WorkflowService) ReassignInspection(orgID, assignmentID, userID, newInspectorID, reason string, notifyInspector bool) (*models.InspectionAssignment, error) {
	var assignment models.InspectionAssignment
	if err := s.db.Where("organization_id = ? AND id = ?", orgID, assignmentID).First(&assignment).Error; err != nil {
		return nil, err
	}

	// Validate new inspector
	var member models.OrganizationMember
	if err := s.db.Where("user_id = ? AND organization_id = ? AND status = 'active'",
		newInspectorID, orgID).First(&member).Error; err != nil {
		return nil, errors.New("invalid inspector")
	}
	if !utils.HasHigherOrEqualPrivilege(member.Role, "inspector") {
		return nil, errors.New("user does not have inspector privileges")
	}

	oldInspectorID := assignment.AssignedTo
	assignment.AssignedTo = newInspectorID
	assignment.DelegatedFrom = &oldInspectorID
	assignment.Status = "pending"
	assignment.AcceptedAt = nil

	// Add reassignment info to metadata
	metadata := make(map[string]interface{})
	if assignment.Metadata != nil {
		json.Unmarshal(assignment.Metadata, &metadata)
	}
	metadata["reassignment_reason"] = reason
	metadata["reassigned_at"] = time.Now()
	metadata["reassigned_by"] = userID
	metadata["previous_inspector"] = oldInspectorID
	metadataJSON, _ := json.Marshal(metadata)
	assignment.Metadata = datatypes.JSON(metadataJSON)

	if err := s.db.Save(&assignment).Error; err != nil {
		return nil, err
	}

	// Update related inspections
	s.db.Model(&models.Inspection{}).Where("assignment_id = ?", assignmentID).
		Updates(map[string]interface{}{
			"inspector_id": newInspectorID,
			"status":       "assigned",
			"updated_at":   time.Now(),
		})

	// Update workloads
	s.updateInspectorWorkload(orgID, oldInspectorID)
	s.updateInspectorWorkload(orgID, newInspectorID)

	if notifyInspector {
		s.notificationService.CreateNotification(&models.CreateNotificationRequest{
			OrganizationID: orgID,
			UserID:         newInspectorID,
			Title:          "Assignment Reassigned",
			Message:        fmt.Sprintf("You have been assigned '%s' (reassigned from another inspector)", assignment.Name),
		})
	}

	return &assignment, nil
}

// =====================================================
// INSPECTION REVIEWS
// =====================================================

type ReviewFilters struct {
	Status       string
	ReviewType   string
	ReviewerID   string
	ProjectID    string
	AssignmentID string
	Page         int
	Limit        int
}

func (s *WorkflowService) CreateInspectionReview(orgID, userID string, req interface{}) (*models.InspectionReview, error) {
	// Implementation for creating inspection reviews
	// This would include validation and review creation logic
	return nil, errors.New("not implemented")
}

func (s *WorkflowService) GetInspectionReviews(orgID, userID string, filters ReviewFilters) ([]models.InspectionReview, int64, error) {
	// Implementation for getting inspection reviews
	return nil, 0, errors.New("not implemented")
}

func (s *WorkflowService) SubmitInspectionReview(orgID, reviewID, userID string, req interface{}) (*models.InspectionReview, error) {
	// Implementation for submitting reviews
	return nil, errors.New("not implemented")
}

// =====================================================
// INSPECTOR WORKLOADS
// =====================================================

type WorkloadFilters struct {
	Available  string
	Overloaded bool
	Search     string
}

func (s *WorkflowService) GetInspectorWorkloads(orgID string, filters WorkloadFilters) ([]models.InspectorWorkload, error) {
	var workloads []models.InspectorWorkload

	query := s.db.Where("organization_id = ?", orgID)

	if filters.Available != "" {
		if filters.Available == "true" {
			query = query.Where("is_available = true")
		} else {
			query = query.Where("is_available = false")
		}
	}

	if filters.Overloaded {
		query = query.Where("current_daily_load >= max_daily_inspections OR current_weekly_load >= max_weekly_inspections")
	}

	if err := query.Preload("Inspector").Find(&workloads).Error; err != nil {
		return nil, err
	}

	return workloads, nil
}

func (s *WorkflowService) UpdateInspectorWorkload(orgID, inspectorID string, req interface{}) (*models.InspectorWorkload, error) {
	var workload models.InspectorWorkload

	// Find or create workload record
	err := s.db.Where("organization_id = ? AND inspector_id = ?", orgID, inspectorID).
		First(&workload).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new workload record
			workload = models.InspectorWorkload{
				OrganizationID: orgID,
				InspectorID:    inspectorID,
			}
		} else {
			return nil, err
		}
	}

	// Update fields from request
	reqData, _ := json.Marshal(req)
	var updateReq map[string]interface{}
	json.Unmarshal(reqData, &updateReq)

	if err := s.db.Model(&workload).Updates(updateReq).Error; err != nil {
		return nil, err
	}

	return &workload, nil
}

// Helper function to update inspector workload
func (s *WorkflowService) updateInspectorWorkload(orgID, inspectorID string) error {
	// This would be called automatically by database triggers in production
	// For now, we'll implement basic logic

	var workload models.InspectorWorkload
	err := s.db.Where("organization_id = ? AND inspector_id = ?", orgID, inspectorID).
		First(&workload).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create new workload record with defaults
			workload = models.InspectorWorkload{
				OrganizationID:       orgID,
				InspectorID:          inspectorID,
				MaxDailyInspections:  8,
				MaxWeeklyInspections: 40,
				MaxConcurrentProjects: 5,
				WorkingHoursPerDay:   8,
				IsAvailable:          true,
			}
			s.db.Create(&workload)
		} else {
			return err
		}
	}

	// Calculate current loads (would be done by triggers in production)
	var dailyLoad, weeklyLoad, overdueCount int64

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
	weekStart := today.AddDate(0, 0, -int(today.Weekday()))

	s.db.Model(&models.Inspection{}).Where("inspector_id = ? AND DATE(scheduled_for) = ? AND status IN ?",
		inspectorID, today, []string{"assigned", "in_progress"}).Count(&dailyLoad)

	s.db.Model(&models.Inspection{}).Where("inspector_id = ? AND DATE(scheduled_for) >= ? AND DATE(scheduled_for) < ? AND status IN ?",
		inspectorID, weekStart, weekStart.AddDate(0, 0, 7), []string{"assigned", "in_progress"}).Count(&weeklyLoad)

	s.db.Model(&models.Inspection{}).Where("inspector_id = ? AND due_date < ? AND status NOT IN ?",
		inspectorID, now, []string{"completed", "cancelled"}).Count(&overdueCount)

	// Update workload
	s.db.Model(&workload).Updates(map[string]interface{}{
		"current_daily_load":   dailyLoad,
		"current_weekly_load":  weeklyLoad,
		"overdue_inspections":  overdueCount,
		"last_updated":         time.Now(),
	})

	return nil
}

// =====================================================
// ANALYTICS AND REPORTING
// =====================================================

type AnalyticsFilters struct {
	StartDate   string
	EndDate     string
	ProjectID   string
	InspectorID string
}

func (s *WorkflowService) GetWorkflowAnalytics(orgID string, filters AnalyticsFilters) (map[string]interface{}, error) {
	// Implementation for workflow analytics
	analytics := map[string]interface{}{
		"summary": map[string]interface{}{
			"total_projects":    0,
			"active_projects":   0,
			"total_assignments": 0,
			"completed_assignments": 0,
		},
		"performance": map[string]interface{}{
			"average_completion_time": 0,
			"on_time_completion_rate": 0,
			"quality_score_average": 0,
		},
	}

	return analytics, nil
}

func (s *WorkflowService) GetProjectProgress(orgID, projectID string) (map[string]interface{}, error) {
	// Implementation for project progress
	return nil, errors.New("not implemented")
}

// =====================================================
// WORKFLOW ALERTS
// =====================================================

type AlertFilters struct {
	AlertType string
	Severity  string
	Status    string
	Page      int
	Limit     int
}

func (s *WorkflowService) GetWorkflowAlerts(orgID, userID string, filters AlertFilters) ([]models.WorkflowAlert, int64, error) {
	var alerts []models.WorkflowAlert
	var total int64

	query := s.db.Where("organization_id = ? AND (assigned_to = ? OR ? IN (SELECT value FROM jsonb_array_elements_text(notify_users)))",
		orgID, userID, userID)

	if filters.AlertType != "" {
		query = query.Where("alert_type = ?", filters.AlertType)
	}
	if filters.Severity != "" {
		query = query.Where("severity = ?", filters.Severity)
	}
	if filters.Status != "" {
		query = query.Where("status = ?", filters.Status)
	}

	query.Model(&models.WorkflowAlert{}).Count(&total)

	offset := (filters.Page - 1) * filters.Limit
	if err := query.Offset(offset).Limit(filters.Limit).
		Order("triggered_at DESC").Find(&alerts).Error; err != nil {
		return nil, 0, err
	}

	return alerts, total, nil
}

func (s *WorkflowService) AcknowledgeAlert(orgID, alertID, userID string) (*models.WorkflowAlert, error) {
	var alert models.WorkflowAlert
	if err := s.db.Where("organization_id = ? AND id = ?", orgID, alertID).First(&alert).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	alert.Status = "acknowledged"
	alert.AcknowledgedAt = &now
	alert.AcknowledgedBy = &userID

	if err := s.db.Save(&alert).Error; err != nil {
		return nil, err
	}

	return &alert, nil
}

func (s *WorkflowService) ResolveAlert(orgID, alertID, userID, resolution string) (*models.WorkflowAlert, error) {
	var alert models.WorkflowAlert
	if err := s.db.Where("organization_id = ? AND id = ?", orgID, alertID).First(&alert).Error; err != nil {
		return nil, err
	}

	now := time.Now()
	alert.Status = "resolved"
	alert.ResolvedAt = &now
	alert.ResolvedBy = &userID

	// Add resolution to details
	details := make(map[string]interface{})
	if alert.Details != nil {
		json.Unmarshal(alert.Details, &details)
	}
	details["resolution"] = resolution
	details["resolved_at"] = now
	detailsJSON, _ := json.Marshal(details)
	alert.Details = datatypes.JSON(detailsJSON)

	if err := s.db.Save(&alert).Error; err != nil {
		return nil, err
	}

	return &alert, nil
}

// Helper function to populate site names from site IDs JSON array
func (s *WorkflowService) populateSiteNames(assignment *models.InspectionAssignment) error {
	if assignment.SiteIDs == nil {
		return nil
	}

	// Parse site IDs from JSON
	var siteIDs []string
	if err := json.Unmarshal(assignment.SiteIDs, &siteIDs); err != nil {
		return err
	}

	if len(siteIDs) == 0 {
		return nil
	}

	// Query sites for names
	var sites []models.Site
	if err := s.db.Where("id IN ? AND organization_id = ?", siteIDs, assignment.OrganizationID).
		Select("id, name").Find(&sites).Error; err != nil {
		return err
	}

	// Create a map of site ID to site name
	siteNames := make(map[string]string)
	for _, site := range sites {
		siteNames[site.ID] = site.Name
	}

	// Add site names to metadata for frontend consumption
	metadata := make(map[string]interface{})
	if assignment.Metadata != nil {
		err := json.Unmarshal(assignment.Metadata, &metadata)
		if err != nil {
			// If unmarshal fails, keep the empty map
			metadata = make(map[string]interface{})
		}
		// Double check that metadata is still a map (defensive programming)
		if metadata == nil {
			metadata = make(map[string]interface{})
		}
	}

	// Create a list of site objects with IDs and names
	var siteDetails []map[string]interface{}
	for _, siteID := range siteIDs {
		siteDetail := map[string]interface{}{
			"id":   siteID,
			"name": siteNames[siteID],
		}
		if siteDetail["name"] == nil {
			siteDetail["name"] = "Unknown Site"
		}
		siteDetails = append(siteDetails, siteDetail)
	}

	metadata["site_details"] = siteDetails
	metadataJSON, _ := json.Marshal(metadata)
	assignment.Metadata = datatypes.JSON(metadataJSON)

	return nil
}