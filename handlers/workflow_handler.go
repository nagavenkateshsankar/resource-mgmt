package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"resource-mgmt/services"
)

type WorkflowHandler struct {
	db              *gorm.DB
	workflowService *services.WorkflowService
}

func NewWorkflowHandler(db *gorm.DB, workflowService *services.WorkflowService) *WorkflowHandler {
	return &WorkflowHandler{
		db:              db,
		workflowService: workflowService,
	}
}

// =====================================================
// INSPECTION PROJECTS ENDPOINTS
// =====================================================

// CreateInspectionProject creates a new inspection project
// POST /api/v1/projects
func (h *WorkflowHandler) CreateInspectionProject(c *gin.Context) {
	orgID := c.GetString("organization_id")
	userID := c.GetString("user_id")

	var req struct {
		Name                  string                 `json:"name" binding:"required"`
		Description           string                 `json:"description"`
		Type                  string                 `json:"type"`
		Priority              string                 `json:"priority"`
		ProjectCode           string                 `json:"project_code"`
		StartDate             *time.Time             `json:"start_date"`
		EndDate               *time.Time             `json:"end_date"`
		DueDate               *time.Time             `json:"due_date"`
		ProjectManager        string                 `json:"project_manager" binding:"required"`
		RequiresApproval      bool                   `json:"requires_approval"`
		AutoAssignInspectors  bool                   `json:"auto_assign_inspectors"`
		AllowSelfAssignment   bool                   `json:"allow_self_assignment"`
		MaxInspectorsPerSite  int                    `json:"max_inspectors_per_site"`
		NotificationSettings  map[string]interface{} `json:"notification_settings"`
		Metadata              map[string]interface{} `json:"metadata"`
		Tags                  []string               `json:"tags"`
		WorkflowSteps         []WorkflowStepRequest  `json:"workflow_steps"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project, err := h.workflowService.CreateInspectionProject(orgID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": project})
}

// GetInspectionProjects retrieves inspection projects with filtering and pagination
// GET /api/v1/projects
func (h *WorkflowHandler) GetInspectionProjects(c *gin.Context) {
	orgID := c.GetString("organization_id")

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	priority := c.Query("priority")
	projectType := c.Query("type")
	managerID := c.Query("manager_id")
	search := c.Query("search")

	filters := services.ProjectFilters{
		Status:    status,
		Priority:  priority,
		Type:      projectType,
		ManagerID: managerID,
		Search:    search,
		Page:      page,
		Limit:     limit,
	}

	projects, total, err := h.workflowService.GetInspectionProjects(orgID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": projects,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetInspectionProject retrieves a specific inspection project
// GET /api/v1/projects/:id
func (h *WorkflowHandler) GetInspectionProject(c *gin.Context) {
	orgID := c.GetString("organization_id")
	projectID := c.Param("id")

	project, err := h.workflowService.GetInspectionProject(orgID, projectID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": project})
}

// UpdateInspectionProject updates an inspection project
// PUT /api/organizations/:org_id/projects/:project_id
func (h *WorkflowHandler) UpdateInspectionProject(c *gin.Context) {
	orgID := c.Param("org_id")
	projectID := c.Param("project_id")
	userID := c.GetString("user_id")

	var req struct {
		Name                  string                 `json:"name"`
		Description           string                 `json:"description"`
		Type                  string                 `json:"type"`
		Priority              string                 `json:"priority"`
		Status                string                 `json:"status"`
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

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project, err := h.workflowService.UpdateInspectionProject(orgID, projectID, userID, req)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": project})
}

// DeleteInspectionProject soft deletes an inspection project
// DELETE /api/organizations/:org_id/projects/:project_id
func (h *WorkflowHandler) DeleteInspectionProject(c *gin.Context) {
	orgID := c.Param("org_id")
	projectID := c.Param("project_id")

	err := h.workflowService.DeleteInspectionProject(orgID, projectID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

// =====================================================
// INSPECTION ASSIGNMENTS ENDPOINTS
// =====================================================

// CreateBulkAssignment creates bulk inspection assignments
// POST /api/v1/assignments
func (h *WorkflowHandler) CreateBulkAssignment(c *gin.Context) {
	orgID := c.GetString("organization_id")
	userID := c.GetString("user_id")

	var req struct {
		Name                 string                 `json:"name" binding:"required"`
		Description          string                 `json:"description"`
		ProjectID            *string                `json:"project_id"`
		Priority             string                 `json:"priority"`
		TemplateID           string                 `json:"template_id" binding:"required"`
		SiteIDs              []string               `json:"site_ids" binding:"required,min=1"`
		InspectorAssignments []InspectorAssignment  `json:"inspector_assignments" binding:"required,min=1"`
		StartDate            *time.Time             `json:"start_date"`
		DueDate              *time.Time             `json:"due_date"`
		EstimatedHours       int                    `json:"estimated_hours"`
		Instructions         string                 `json:"instructions"`
		RequiresAcceptance   bool                   `json:"requires_acceptance"`
		AllowReassignment    bool                   `json:"allow_reassignment"`
		NotifyOnOverdue      bool                   `json:"notify_on_overdue"`
		Metadata             map[string]interface{} `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assignments, err := h.workflowService.CreateBulkAssignment(orgID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": assignments})
}

// GetInspectionAssignments retrieves inspection assignments with filtering
// GET /api/v1/assignments
func (h *WorkflowHandler) GetInspectionAssignments(c *gin.Context) {
	orgID := c.GetString("organization_id")
	userID := c.GetString("user_id")

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	priority := c.Query("priority")
	assignedTo := c.Query("assigned_to")
	projectID := c.Query("project_id")
	search := c.Query("search")
	overdue := c.Query("overdue") == "true"

	filters := services.AssignmentFilters{
		Status:     status,
		Priority:   priority,
		AssignedTo: assignedTo,
		ProjectID:  projectID,
		Search:     search,
		Overdue:    overdue,
		Page:       page,
		Limit:      limit,
	}

	assignments, total, err := h.workflowService.GetInspectionAssignments(orgID, userID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": assignments,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetInspectionAssignment retrieves a specific inspection assignment
// GET /api/v1/assignments/:id
func (h *WorkflowHandler) GetInspectionAssignment(c *gin.Context) {
	orgID := c.GetString("organization_id")
	assignmentID := c.Param("id")

	assignment, err := h.workflowService.GetInspectionAssignment(orgID, assignmentID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assignment})
}

// AcceptAssignment allows an inspector to accept an assignment
// POST /api/organizations/:org_id/assignments/:assignment_id/accept
func (h *WorkflowHandler) AcceptAssignment(c *gin.Context) {
	orgID := c.Param("org_id")
	assignmentID := c.Param("assignment_id")
	userID := c.GetString("user_id")

	assignment, err := h.workflowService.AcceptAssignment(orgID, assignmentID, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assignment})
}

// RejectAssignment allows an inspector to reject an assignment
// POST /api/organizations/:org_id/assignments/:assignment_id/reject
func (h *WorkflowHandler) RejectAssignment(c *gin.Context) {
	orgID := c.Param("org_id")
	assignmentID := c.Param("assignment_id")
	userID := c.GetString("user_id")

	var req struct {
		Reason string `json:"reason" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assignment, err := h.workflowService.RejectAssignment(orgID, assignmentID, userID, req.Reason)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assignment})
}

// ReassignInspection allows reassigning an inspection to another inspector
// POST /api/organizations/:org_id/assignments/:assignment_id/reassign
func (h *WorkflowHandler) ReassignInspection(c *gin.Context) {
	orgID := c.Param("org_id")
	assignmentID := c.Param("assignment_id")
	userID := c.GetString("user_id")

	var req struct {
		NewInspectorID string `json:"new_inspector_id" binding:"required"`
		Reason         string `json:"reason" binding:"required"`
		NotifyInspector bool  `json:"notify_inspector"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	assignment, err := h.workflowService.ReassignInspection(orgID, assignmentID, userID, req.NewInspectorID, req.Reason, req.NotifyInspector)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": assignment})
}

// =====================================================
// INSPECTION REVIEWS ENDPOINTS
// =====================================================

// CreateInspectionReview creates a new inspection review
// POST /api/organizations/:org_id/reviews
func (h *WorkflowHandler) CreateInspectionReview(c *gin.Context) {
	orgID := c.Param("org_id")
	userID := c.GetString("user_id")

	var req struct {
		ProjectID        *string                `json:"project_id"`
		AssignmentID     *string                `json:"assignment_id"`
		InspectionID     *string                `json:"inspection_id"`
		ReviewType       string                 `json:"review_type" binding:"required"`
		ReviewLevel      int                    `json:"review_level"`
		Priority         string                 `json:"priority"`
		ReviewerID       string                 `json:"reviewer_id" binding:"required"`
		DueDate          *time.Time             `json:"due_date"`
		ReviewCriteria   map[string]interface{} `json:"review_criteria"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	review, err := h.workflowService.CreateInspectionReview(orgID, userID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": review})
}

// GetInspectionReviews retrieves inspection reviews with filtering
// GET /api/organizations/:org_id/reviews
func (h *WorkflowHandler) GetInspectionReviews(c *gin.Context) {
	orgID := c.Param("org_id")
	userID := c.GetString("user_id")

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	status := c.Query("status")
	reviewType := c.Query("review_type")
	reviewerID := c.Query("reviewer_id")
	projectID := c.Query("project_id")
	assignmentID := c.Query("assignment_id")

	filters := services.ReviewFilters{
		Status:       status,
		ReviewType:   reviewType,
		ReviewerID:   reviewerID,
		ProjectID:    projectID,
		AssignmentID: assignmentID,
		Page:         page,
		Limit:        limit,
	}

	reviews, total, err := h.workflowService.GetInspectionReviews(orgID, userID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": reviews,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// SubmitInspectionReview submits a completed inspection review
// POST /api/organizations/:org_id/reviews/:review_id/submit
func (h *WorkflowHandler) SubmitInspectionReview(c *gin.Context) {
	orgID := c.Param("org_id")
	reviewID := c.Param("review_id")
	userID := c.GetString("user_id")

	var req struct {
		Decision          string                   `json:"decision" binding:"required"`
		Comments          string                   `json:"comments"`
		RequiredChanges   []map[string]interface{} `json:"required_changes"`
		QualityScore      *float64                 `json:"quality_score"`
		ComplianceIssues  []map[string]interface{} `json:"compliance_issues"`
		Recommendations   string                   `json:"recommendations"`
		EscalatedTo       *string                  `json:"escalated_to"`
		EscalationReason  string                   `json:"escalation_reason"`
		Attachments       []string                 `json:"attachments"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	review, err := h.workflowService.SubmitInspectionReview(orgID, reviewID, userID, req)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": review})
}

// =====================================================
// INSPECTOR WORKLOAD ENDPOINTS
// =====================================================

// GetInspectorWorkloads retrieves inspector workload information
// GET /api/organizations/:org_id/workloads
func (h *WorkflowHandler) GetInspectorWorkloads(c *gin.Context) {
	orgID := c.Param("org_id")

	// Parse query parameters
	available := c.Query("available")
	overloaded := c.Query("overloaded") == "true"
	search := c.Query("search")

	filters := services.WorkloadFilters{
		Available:  available,
		Overloaded: overloaded,
		Search:     search,
	}

	workloads, err := h.workflowService.GetInspectorWorkloads(orgID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": workloads})
}

// UpdateInspectorWorkload updates inspector workload settings
// PUT /api/organizations/:org_id/workloads/:inspector_id
func (h *WorkflowHandler) UpdateInspectorWorkload(c *gin.Context) {
	orgID := c.Param("org_id")
	inspectorID := c.Param("inspector_id")

	var req struct {
		MaxDailyInspections   int        `json:"max_daily_inspections"`
		MaxWeeklyInspections  int        `json:"max_weekly_inspections"`
		MaxConcurrentProjects int        `json:"max_concurrent_projects"`
		WorkingHoursPerDay    int        `json:"working_hours_per_day"`
		IsAvailable           bool       `json:"is_available"`
		AvailableFrom         *time.Time `json:"available_from"`
		AvailableUntil        *time.Time `json:"available_until"`
		PreferredSiteTypes    []string   `json:"preferred_site_types"`
		PreferredRegions      []string   `json:"preferred_regions"`
		Specializations       []string   `json:"specializations"`
		MaxTravelDistance     int        `json:"max_travel_distance"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	workload, err := h.workflowService.UpdateInspectorWorkload(orgID, inspectorID, req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": workload})
}

// =====================================================
// WORKFLOW ANALYTICS ENDPOINTS
// =====================================================

// GetWorkflowAnalytics retrieves workflow performance analytics
// GET /api/organizations/:org_id/workflow/analytics
func (h *WorkflowHandler) GetWorkflowAnalytics(c *gin.Context) {
	orgID := c.Param("org_id")

	// Parse query parameters
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	projectID := c.Query("project_id")
	inspectorID := c.Query("inspector_id")

	analytics, err := h.workflowService.GetWorkflowAnalytics(orgID, services.AnalyticsFilters{
		StartDate:   startDate,
		EndDate:     endDate,
		ProjectID:   projectID,
		InspectorID: inspectorID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": analytics})
}

// GetProjectProgress retrieves project progress summary
// GET /api/organizations/:org_id/projects/:project_id/progress
func (h *WorkflowHandler) GetProjectProgress(c *gin.Context) {
	orgID := c.Param("org_id")
	projectID := c.Param("project_id")

	progress, err := h.workflowService.GetProjectProgress(orgID, projectID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": progress})
}

// =====================================================
// WORKFLOW ALERTS ENDPOINTS
// =====================================================

// GetWorkflowAlerts retrieves workflow alerts
// GET /api/organizations/:org_id/workflow/alerts
func (h *WorkflowHandler) GetWorkflowAlerts(c *gin.Context) {
	orgID := c.Param("org_id")
	userID := c.GetString("user_id")

	// Parse query parameters
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	alertType := c.Query("alert_type")
	severity := c.Query("severity")
	status := c.Query("status")

	filters := services.AlertFilters{
		AlertType: alertType,
		Severity:  severity,
		Status:    status,
		Page:      page,
		Limit:     limit,
	}

	alerts, total, err := h.workflowService.GetWorkflowAlerts(orgID, userID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": alerts,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// AcknowledgeAlert acknowledges a workflow alert
// POST /api/organizations/:org_id/workflow/alerts/:alert_id/acknowledge
func (h *WorkflowHandler) AcknowledgeAlert(c *gin.Context) {
	orgID := c.Param("org_id")
	alertID := c.Param("alert_id")
	userID := c.GetString("user_id")

	alert, err := h.workflowService.AcknowledgeAlert(orgID, alertID, userID)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Alert not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alert})
}

// ResolveAlert resolves a workflow alert
// POST /api/organizations/:org_id/workflow/alerts/:alert_id/resolve
func (h *WorkflowHandler) ResolveAlert(c *gin.Context) {
	orgID := c.Param("org_id")
	alertID := c.Param("alert_id")
	userID := c.GetString("user_id")

	var req struct {
		Resolution string `json:"resolution" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	alert, err := h.workflowService.ResolveAlert(orgID, alertID, userID, req.Resolution)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Alert not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": alert})
}

// =====================================================
// HELPER TYPES
// =====================================================

type WorkflowStepRequest struct {
	Name             string                 `json:"name" binding:"required"`
	Description      string                 `json:"description"`
	StepType         string                 `json:"step_type" binding:"required"`
	StepOrder        int                    `json:"step_order" binding:"required"`
	IsRequired       bool                   `json:"is_required"`
	IsParallel       bool                   `json:"is_parallel"`
	RequiredRole     string                 `json:"required_role"`
	AssigneeType     string                 `json:"assignee_type"`
	AssigneeID       *string                `json:"assignee_id"`
	DurationHours    int                    `json:"duration_hours"`
	Prerequisites    []string               `json:"prerequisites"`
	Conditions       map[string]interface{} `json:"conditions"`
	AutoAdvance      bool                   `json:"auto_advance"`
}

type InspectorAssignment struct {
	InspectorID string   `json:"inspector_id" binding:"required"`
	SiteIDs     []string `json:"site_ids" binding:"required,min=1"`
}