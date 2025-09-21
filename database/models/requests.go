package models

import (
	"time"
	"github.com/google/uuid"
)

type CreateInspectionRequest struct {
	TemplateID   uuid.UUID  `json:"template_id" binding:"required"`
	InspectorID  string     `json:"inspector_id" binding:"required"`
	AssignedBy   *string    `json:"assigned_by"`
	SiteID       string     `json:"site_id" binding:"required"`
	Priority     string     `json:"priority"`
	ScheduledFor *time.Time `json:"scheduled_for"`
	DueDate      *time.Time `json:"due_date"`
	Notes        string     `json:"notes"`
	Status       string     `json:"status"`
}

type UpdateInspectionRequest struct {
	SiteID   string     `json:"site_id"`
	Status   string     `json:"status"`
	Priority string     `json:"priority"`
	DueDate  *time.Time `json:"due_date"`
	Notes    string     `json:"notes"`
}

type SubmitInspectionRequest struct {
	FormData map[string]interface{} `json:"form_data" binding:"required"`
	Status   string                 `json:"status"`
}

type CreateTemplateRequest struct {
	Name         string                 `json:"name" binding:"required"`
	Description  string                 `json:"description"`
	Category     string                 `json:"category"`
	FieldsSchema map[string]interface{} `json:"fields_schema" binding:"required"`
}

type UpdateTemplateRequest struct {
	Name         string                 `json:"name"`
	Description  string                 `json:"description"`
	Category     string                 `json:"category"`
	FieldsSchema map[string]interface{} `json:"fields_schema"`
	IsActive     *bool                  `json:"is_active"`
}

type CreateUserRequest struct {
	OrganizationID string                 `json:"organization_id"`
	Name           string                 `json:"name" binding:"required"`
	Email          string                 `json:"email" binding:"required,email"`
	Password       string                 `json:"password" binding:"required,min=6"`
	Role           string                 `json:"role"`
	Permissions    map[string]interface{} `json:"permissions"`
}

type UpdateUserRequest struct {
	Name        string                 `json:"name"`
	Role        string                 `json:"role"`
	Status      *string                `json:"status"`
	Permissions map[string]interface{} `json:"permissions"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Name               string `json:"name" binding:"required"`
	Email              string `json:"email" binding:"required,email"`
	Password           string `json:"password" binding:"required,min=6"`
	OrganizationName   string `json:"organization_name" binding:"required"`
	OrganizationDomain string `json:"organization_domain" binding:"required"`
}

// Organization-related requests
type CreateOrganizationRequest struct {
	OrganizationName string `json:"organization_name" binding:"required"`
	AdminName        string `json:"admin_name" binding:"required"`
	AdminEmail       string `json:"admin_email" binding:"required,email"`
	AdminPassword    string `json:"admin_password" binding:"required,min=6"`
	Domain           string `json:"domain" binding:"required,min=3,max=50"`
	Plan             string `json:"plan"`
}

type UpdateOrganizationRequest struct {
	Name     string                 `json:"name"`
	Settings map[string]interface{} `json:"settings"`
	Plan     string                 `json:"plan"`
	IsActive *bool                  `json:"is_active"`
}

type InviteUserRequest struct {
	Name  string `json:"name" binding:"required"`
	Email string `json:"email" binding:"required,email"`
	Role  string `json:"role" binding:"required"`
}

type DashboardFilters struct {
	StartDate   time.Time    `json:"start_date"`
	EndDate     time.Time    `json:"end_date"`
	InspectorID *string      `json:"inspector_id"`
	TemplateID  *uuid.UUID   `json:"template_id"`
	Status      string       `json:"status"`
	Priority    string       `json:"priority"`
}

type CreateAttachmentRequest struct {
	InspectionID uuid.UUID `json:"inspection_id" binding:"required"`
	FileName     string `json:"file_name" binding:"required"`
	FilePath     string `json:"file_path" binding:"required"`
	FileType     string `json:"file_type"`
	FileSize     int64  `json:"file_size"`
	Description  string `json:"description"`
	FieldID      string `json:"field_id"`
	FieldName    string `json:"field_name"`
	StorageURL   string `json:"storage_url"`
}

type AssignInspectionRequest struct {
	InspectorID  string     `json:"inspector_id" binding:"required"`
	AssignedBy   string     `json:"assigned_by" binding:"required"`
	DueDate      *time.Time `json:"due_date"`
	ScheduledFor *time.Time `json:"scheduled_for"`
	Priority     string     `json:"priority"`
	Notes        string     `json:"notes"`
}

type UpdateInspectionStatusRequest struct {
	Status string `json:"status" binding:"required"`
	Notes  string `json:"notes"`
}

type CreateNotificationRequest struct {
	OrganizationID string     `json:"organization_id" binding:"required"`
	UserID         string     `json:"user_id" binding:"required"`
	InspectionID   *uuid.UUID `json:"inspection_id"`
	Title          string `json:"title" binding:"required"`
	Message        string `json:"message" binding:"required"`
	Type           string `json:"type"`
}
