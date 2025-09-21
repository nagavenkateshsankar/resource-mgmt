package models

import (
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"time"
)

// InspectionProject represents a group of inspections for project-based workflows
type InspectionProject struct {
	ID             string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID string         `json:"organization_id" gorm:"not null;index"`
	Name           string         `json:"name" gorm:"size:255;not null"`
	Description    string         `json:"description" gorm:"type:text"`
	Type           string         `json:"type" gorm:"size:100;default:'regular'"` // regular, safety, compliance, audit
	Priority       string         `json:"priority" gorm:"size:50;default:'medium'"` // low, medium, high, critical
	Status         string         `json:"status" gorm:"size:50;default:'planning'"` // planning, active, review, completed, cancelled
	ProjectCode    string         `json:"project_code" gorm:"size:100;unique;index"` // Optional project identifier

	// Project Timeline
	StartDate      *time.Time     `json:"start_date"`
	EndDate        *time.Time     `json:"end_date"`
	DueDate        *time.Time     `json:"due_date"`

	// Assignment and Management
	ProjectManager string         `json:"project_manager"` // GlobalUser ID who manages the project
	CreatedBy      string         `json:"created_by"`
	UpdatedBy      string         `json:"updated_by"`

	// Configuration
	RequiresApproval      bool           `json:"requires_approval" gorm:"default:true"`
	AutoAssignInspectors  bool           `json:"auto_assign_inspectors" gorm:"default:false"`
	AllowSelfAssignment   bool           `json:"allow_self_assignment" gorm:"default:false"`
	MaxInspectorsPerSite  int            `json:"max_inspectors_per_site" gorm:"default:1"`
	NotificationSettings  datatypes.JSON `json:"notification_settings" gorm:"type:jsonb;default:'{}'"`

	// Metadata
	Metadata      datatypes.JSON `json:"metadata" gorm:"type:jsonb;default:'{}'"` // Custom project fields
	Tags          datatypes.JSON `json:"tags" gorm:"type:jsonb;default:'[]'"` // Project tags for categorization

	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`

	// Relationships
	Organization    Organization         `json:"organization" gorm:"foreignKey:OrganizationID"`
	Manager         GlobalUser           `json:"manager" gorm:"foreignKey:ProjectManager"`
	Creator         GlobalUser           `json:"creator" gorm:"foreignKey:CreatedBy"`
	Updater         GlobalUser           `json:"updater" gorm:"foreignKey:UpdatedBy"`
	WorkflowSteps   []WorkflowStep       `json:"workflow_steps" gorm:"foreignKey:ProjectID"`
	Assignments     []InspectionAssignment `json:"assignments" gorm:"foreignKey:ProjectID"`
	Reviews         []InspectionReview   `json:"reviews" gorm:"foreignKey:ProjectID"`
}

// WorkflowStep defines the steps in an inspection workflow
type WorkflowStep struct {
	ID               string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	ProjectID        string         `json:"project_id" gorm:"not null;index"`
	Name             string         `json:"name" gorm:"size:255;not null"`
	Description      string         `json:"description" gorm:"type:text"`
	StepType         string         `json:"step_type" gorm:"size:100;not null"` // assignment, inspection, review, approval, notification
	StepOrder        int            `json:"step_order" gorm:"not null;index"`
	IsRequired       bool           `json:"is_required" gorm:"default:true"`
	IsParallel       bool           `json:"is_parallel" gorm:"default:false"` // Can run in parallel with other steps

	// Step Configuration
	RequiredRole     string         `json:"required_role" gorm:"size:100"` // minimum role required
	AssigneeType     string         `json:"assignee_type" gorm:"size:100"` // specific_user, role_based, auto_assign
	AssigneeID       *string        `json:"assignee_id"` // specific user ID if assignee_type is specific_user
	DurationHours    int            `json:"duration_hours" gorm:"default:24"` // expected completion time

	// Conditions
	Prerequisites    datatypes.JSON `json:"prerequisites" gorm:"type:jsonb;default:'[]'"` // Required previous steps
	Conditions       datatypes.JSON `json:"conditions" gorm:"type:jsonb;default:'{}'"` // Conditional logic
	AutoAdvance      bool           `json:"auto_advance" gorm:"default:false"` // Auto-advance to next step

	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`

	// Relationships
	Project          InspectionProject `json:"project" gorm:"foreignKey:ProjectID"`
	Assignee         *GlobalUser       `json:"assignee" gorm:"foreignKey:AssigneeID"`
	StepExecutions   []StepExecution   `json:"step_executions" gorm:"foreignKey:WorkflowStepID"`
}

// StepExecution tracks the execution of workflow steps for specific assignments
type StepExecution struct {
	ID               string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	WorkflowStepID   string         `json:"workflow_step_id" gorm:"not null;index"`
	AssignmentID     string         `json:"assignment_id" gorm:"not null;index"`
	ExecutorID       string         `json:"executor_id" gorm:"not null"` // Who executed this step
	Status           string         `json:"status" gorm:"size:50;default:'pending'"` // pending, in_progress, completed, skipped, failed

	// Execution Details
	StartedAt        *time.Time     `json:"started_at"`
	CompletedAt      *time.Time     `json:"completed_at"`
	DueDate          *time.Time     `json:"due_date"`
	ActualDuration   int            `json:"actual_duration"` // minutes taken to complete

	// Results
	Result           string         `json:"result" gorm:"size:100"` // passed, failed, requires_attention, etc.
	Notes            string         `json:"notes" gorm:"type:text"`
	Data             datatypes.JSON `json:"data" gorm:"type:jsonb;default:'{}'"` // Step-specific data

	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`

	// Relationships
	WorkflowStep     WorkflowStep          `json:"workflow_step" gorm:"foreignKey:WorkflowStepID"`
	Assignment       InspectionAssignment  `json:"assignment" gorm:"foreignKey:AssignmentID"`
	Executor         GlobalUser            `json:"executor" gorm:"foreignKey:ExecutorID"`
}

// InspectionAssignment represents bulk assignment of inspections to inspectors
type InspectionAssignment struct {
	ID                string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID    string         `json:"organization_id" gorm:"not null;index"`
	ProjectID         *string        `json:"project_id" gorm:"index"` // Optional project association
	BatchID           string         `json:"batch_id" gorm:"index"` // For bulk operations tracking

	// Assignment Details
	Name              string         `json:"name" gorm:"size:255;not null"`
	Description       string         `json:"description" gorm:"type:text"`
	AssignmentType    string         `json:"assignment_type" gorm:"size:100;default:'manual'"` // manual, auto, bulk, project
	Status            string         `json:"status" gorm:"size:50;default:'pending'"` // pending, active, completed, cancelled
	Priority          string         `json:"priority" gorm:"size:50;default:'medium'"` // low, medium, high, critical

	// Assignment Source
	AssignedBy        string         `json:"assigned_by" gorm:"not null"` // Who created the assignment
	AssignedTo        string         `json:"assigned_to" gorm:"not null"` // Inspector assigned to
	DelegatedFrom     *string        `json:"delegated_from"` // If reassigned/delegated

	// Timeline
	AssignedAt        time.Time      `json:"assigned_at" gorm:"default:current_timestamp()"`
	StartDate         *time.Time     `json:"start_date"`
	DueDate           *time.Time     `json:"due_date"`
	EstimatedHours    int            `json:"estimated_hours" gorm:"default:4"`

	// Tracking
	AcceptedAt        *time.Time     `json:"accepted_at"`
	StartedAt         *time.Time     `json:"started_at"`
	CompletedAt       *time.Time     `json:"completed_at"`

	// Configuration
	RequiresAcceptance bool          `json:"requires_acceptance" gorm:"default:true"`
	AllowReassignment  bool          `json:"allow_reassignment" gorm:"default:true"`
	NotifyOnOverdue    bool          `json:"notify_on_overdue" gorm:"default:true"`

	// Assignment Data
	SiteIDs           datatypes.JSON `json:"site_ids" gorm:"type:jsonb;not null"` // Array of site IDs
	TemplateID        string         `json:"template_id" gorm:"not null"`
	Instructions      string         `json:"instructions" gorm:"type:text"`
	Metadata          datatypes.JSON `json:"metadata" gorm:"type:jsonb;default:'{}'"` // Custom fields

	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`

	// Relationships
	Organization      Organization         `json:"organization" gorm:"foreignKey:OrganizationID"`
	Project           *InspectionProject   `json:"project" gorm:"foreignKey:ProjectID"`
	Assigner          GlobalUser           `json:"assigner" gorm:"foreignKey:AssignedBy"`
	Inspector         GlobalUser           `json:"inspector" gorm:"foreignKey:AssignedTo"`
	DelegatedFromUser *GlobalUser          `json:"delegated_from_user" gorm:"foreignKey:DelegatedFrom"`
	Template          Template             `json:"template" gorm:"foreignKey:TemplateID"`
	Inspections       []Inspection         `json:"inspections" gorm:"foreignKey:AssignmentID"` // Individual inspections created from this assignment
	Reviews           []InspectionReview   `json:"reviews" gorm:"foreignKey:AssignmentID"`
	StepExecutions    []StepExecution      `json:"step_executions" gorm:"foreignKey:AssignmentID"`
}

// InspectionReview represents the review and approval process
type InspectionReview struct {
	ID                string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID    string         `json:"organization_id" gorm:"not null;index"`
	ProjectID         *string        `json:"project_id" gorm:"index"`
	AssignmentID      *string        `json:"assignment_id" gorm:"index"`
	InspectionID      *string        `json:"inspection_id" gorm:"index"` // Individual inspection review

	// Review Details
	ReviewType        string         `json:"review_type" gorm:"size:100;not null"` // quality, compliance, approval, escalation
	ReviewLevel       int            `json:"review_level" gorm:"default:1"` // 1st level, 2nd level, etc.
	Status            string         `json:"status" gorm:"size:50;default:'pending'"` // pending, in_progress, approved, rejected, escalated
	Priority          string         `json:"priority" gorm:"size:50;default:'medium'"`

	// Review Assignment
	ReviewerID        string         `json:"reviewer_id" gorm:"not null"` // Who is reviewing
	AssignedBy        string         `json:"assigned_by" gorm:"not null"` // Who assigned the review
	AssignedAt        time.Time      `json:"assigned_at" gorm:"default:current_timestamp()"`
	DueDate           *time.Time     `json:"due_date"`

	// Review Process
	StartedAt         *time.Time     `json:"started_at"`
	CompletedAt       *time.Time     `json:"completed_at"`
	Decision          string         `json:"decision" gorm:"size:100"` // approved, rejected, requires_changes, escalated

	// Review Content
	Comments          string         `json:"comments" gorm:"type:text"`
	RequiredChanges   datatypes.JSON `json:"required_changes" gorm:"type:jsonb;default:'[]'"` // Specific changes needed
	QualityScore      *float64       `json:"quality_score"` // 0-100 quality rating
	ComplianceIssues  datatypes.JSON `json:"compliance_issues" gorm:"type:jsonb;default:'[]'"`
	Recommendations   string         `json:"recommendations" gorm:"type:text"`

	// Escalation
	EscalatedTo       *string        `json:"escalated_to"` // If escalated to higher authority
	EscalationReason  string         `json:"escalation_reason" gorm:"type:text"`
	EscalatedAt       *time.Time     `json:"escalated_at"`

	// Metadata
	ReviewCriteria    datatypes.JSON `json:"review_criteria" gorm:"type:jsonb;default:'{}'"` // Criteria used for review
	Attachments       datatypes.JSON `json:"attachments" gorm:"type:jsonb;default:'[]'"` // Supporting documents

	CreatedAt         time.Time      `json:"created_at"`
	UpdatedAt         time.Time      `json:"updated_at"`

	// Relationships
	Organization      Organization          `json:"organization" gorm:"foreignKey:OrganizationID"`
	Project           *InspectionProject    `json:"project" gorm:"foreignKey:ProjectID"`
	Assignment        *InspectionAssignment `json:"assignment" gorm:"foreignKey:AssignmentID"`
	Inspection        *Inspection           `json:"inspection" gorm:"foreignKey:InspectionID"`
	Reviewer          GlobalUser            `json:"reviewer" gorm:"foreignKey:ReviewerID"`
	Assigner          GlobalUser            `json:"assigner" gorm:"foreignKey:AssignedBy"`
	EscalatedToUser   *GlobalUser           `json:"escalated_to_user" gorm:"foreignKey:EscalatedTo"`
}

// InspectorWorkload tracks inspector capacity and workload distribution
type InspectorWorkload struct {
	ID                 string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID     string         `json:"organization_id" gorm:"not null;index"`
	InspectorID        string         `json:"inspector_id" gorm:"not null;index"`

	// Capacity Configuration
	MaxDailyInspections    int       `json:"max_daily_inspections" gorm:"default:8"`
	MaxWeeklyInspections   int       `json:"max_weekly_inspections" gorm:"default:40"`
	MaxConcurrentProjects  int       `json:"max_concurrent_projects" gorm:"default:5"`
	WorkingHoursPerDay     int       `json:"working_hours_per_day" gorm:"default:8"`

	// Current Load (calculated fields)
	CurrentDailyLoad       int       `json:"current_daily_load" gorm:"default:0"`
	CurrentWeeklyLoad      int       `json:"current_weekly_load" gorm:"default:0"`
	ActiveProjects         int       `json:"active_projects" gorm:"default:0"`
	PendingAssignments     int       `json:"pending_assignments" gorm:"default:0"`
	OverdueInspections     int       `json:"overdue_inspections" gorm:"default:0"`

	// Availability
	IsAvailable           bool       `json:"is_available" gorm:"default:true"`
	AvailableFrom         *time.Time `json:"available_from"`
	AvailableUntil        *time.Time `json:"available_until"`
	ScheduledTimeOff      datatypes.JSON `json:"scheduled_time_off" gorm:"type:jsonb;default:'[]'"` // Array of time-off periods

	// Performance Metrics
	CompletionRate        float64    `json:"completion_rate" gorm:"default:0"` // Percentage of on-time completions
	AverageInspectionTime int        `json:"average_inspection_time" gorm:"default:240"` // minutes
	QualityScore          float64    `json:"quality_score" gorm:"default:0"` // Average quality score

	// Preferences
	PreferredSiteTypes    datatypes.JSON `json:"preferred_site_types" gorm:"type:jsonb;default:'[]'"`
	PreferredRegions      datatypes.JSON `json:"preferred_regions" gorm:"type:jsonb;default:'[]'"`
	Specializations       datatypes.JSON `json:"specializations" gorm:"type:jsonb;default:'[]'"`
	MaxTravelDistance     int            `json:"max_travel_distance" gorm:"default:50"` // kilometers

	LastUpdated           time.Time      `json:"last_updated" gorm:"default:current_timestamp()"`
	CreatedAt             time.Time      `json:"created_at"`
	UpdatedAt             time.Time      `json:"updated_at"`

	// Relationships
	Organization          Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
	Inspector             GlobalUser   `json:"inspector" gorm:"foreignKey:InspectorID"`
}

// WorkflowAlert represents notifications and alerts for workflow management
type WorkflowAlert struct {
	ID               string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID   string         `json:"organization_id" gorm:"not null;index"`
	AlertType        string         `json:"alert_type" gorm:"size:100;not null"` // overdue, quality_issue, capacity_exceeded, escalation
	Severity         string         `json:"severity" gorm:"size:50;default:'medium'"` // low, medium, high, critical
	Status           string         `json:"status" gorm:"size:50;default:'active'"` // active, acknowledged, resolved, dismissed

	// Alert Target
	TargetType       string         `json:"target_type" gorm:"size:100;not null"` // project, assignment, inspection, inspector
	TargetID         string         `json:"target_id" gorm:"not null"`

	// Alert Content
	Title            string         `json:"title" gorm:"size:255;not null"`
	Message          string         `json:"message" gorm:"type:text;not null"`
	Details          datatypes.JSON `json:"details" gorm:"type:jsonb;default:'{}'"` // Additional alert data

	// Recipients
	AssignedTo       string         `json:"assigned_to" gorm:"not null"` // Primary responsible person
	NotifyUsers      datatypes.JSON `json:"notify_users" gorm:"type:jsonb;default:'[]'"` // Additional users to notify

	// Timing
	TriggeredAt      time.Time      `json:"triggered_at" gorm:"default:current_timestamp()"`
	AcknowledgedAt   *time.Time     `json:"acknowledged_at"`
	AcknowledgedBy   *string        `json:"acknowledged_by"`
	ResolvedAt       *time.Time     `json:"resolved_at"`
	ResolvedBy       *string        `json:"resolved_by"`
	DismissedAt      *time.Time     `json:"dismissed_at"`
	DismissedBy      *string        `json:"dismissed_by"`

	// Auto-resolution
	AutoResolve      bool           `json:"auto_resolve" gorm:"default:false"`
	AutoResolveAt    *time.Time     `json:"auto_resolve_at"`

	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`

	// Relationships
	Organization     Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
	AssignedUser     GlobalUser   `json:"assigned_user" gorm:"foreignKey:AssignedTo"`
	AcknowledgedByUser *GlobalUser `json:"acknowledged_by_user" gorm:"foreignKey:AcknowledgedBy"`
	ResolvedByUser   *GlobalUser   `json:"resolved_by_user" gorm:"foreignKey:ResolvedBy"`
	DismissedByUser  *GlobalUser   `json:"dismissed_by_user" gorm:"foreignKey:DismissedBy"`
}

// Table name overrides
func (InspectionProject) TableName() string {
	return "inspection_projects"
}

func (WorkflowStep) TableName() string {
	return "workflow_steps"
}

func (StepExecution) TableName() string {
	return "step_executions"
}

func (InspectionAssignment) TableName() string {
	return "inspection_assignments"
}

func (InspectionReview) TableName() string {
	return "inspection_reviews"
}

func (InspectorWorkload) TableName() string {
	return "inspector_workloads"
}

func (WorkflowAlert) TableName() string {
	return "workflow_alerts"
}

// BeforeCreate hooks for UUID generation
func (p *InspectionProject) BeforeCreate(tx *gorm.DB) error {
	if p.ID == "" {
		// Let PostgreSQL generate the UUID
		return nil
	}
	return nil
}

func (s *WorkflowStep) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		return nil
	}
	return nil
}

func (e *StepExecution) BeforeCreate(tx *gorm.DB) error {
	if e.ID == "" {
		return nil
	}
	return nil
}

func (a *InspectionAssignment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		return nil
	}
	return nil
}

func (r *InspectionReview) BeforeCreate(tx *gorm.DB) error {
	if r.ID == "" {
		return nil
	}
	return nil
}

func (w *InspectorWorkload) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		return nil
	}
	return nil
}

func (a *WorkflowAlert) BeforeCreate(tx *gorm.DB) error {
	if a.ID == "" {
		return nil
	}
	return nil
}