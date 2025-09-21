package services

import (
	"context"
	"encoding/json"
	"resource-mgmt/config"
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// AuditAction represents the type of action performed
type AuditAction string

const (
	UserCreated        AuditAction = "user_created"
	UserUpdated        AuditAction = "user_updated"
	UserDeleted        AuditAction = "user_deleted"
	UserRoleChanged    AuditAction = "user_role_changed"
	UserStatusChanged  AuditAction = "user_status_changed"
	UserPasswordReset  AuditAction = "user_password_reset"
	LoginAttempt       AuditAction = "login_attempt"
	LoginSuccess       AuditAction = "login_success"
	LoginFailure       AuditAction = "login_failure"
	PermissionDenied   AuditAction = "permission_denied"
)

// AuditLog represents an audit trail entry
type AuditLog struct {
	ID             string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID string         `json:"organization_id" gorm:"not null;index"`
	UserID         string         `json:"user_id" gorm:"not null;index"`
	TargetUserID   *string        `json:"target_user_id" gorm:"index"` // For user management actions
	Action         AuditAction    `json:"action" gorm:"not null;index"`
	ResourceType   string         `json:"resource_type" gorm:"not null"` // user, inspection, etc.
	ResourceID     *string        `json:"resource_id" gorm:"index"`
	Details        datatypes.JSON `json:"details" gorm:"type:jsonb"`
	IPAddress      string         `json:"ip_address" gorm:"size:45"`
	UserAgent      string         `json:"user_agent" gorm:"size:500"`
	Success        bool           `json:"success" gorm:"default:true"`
	ErrorMessage   *string        `json:"error_message" gorm:"type:text"`
	CreatedAt      time.Time      `json:"created_at" gorm:"index"`
}

type AuditService struct {
	db *gorm.DB
}

func NewAuditService() *AuditService {
	return &AuditService{
		db: config.DB,
	}
}

// LogUserAction logs user management actions with comprehensive details
func (s *AuditService) LogUserAction(ctx context.Context, action AuditAction, actorUserID string, targetUserID *string, details map[string]interface{}, success bool, errorMsg *string) error {
	// Get organization ID from context
	orgID, ok := ctx.Value("organization_id").(string)
	if !ok {
		orgID = "unknown"
	}

	// Get IP and User Agent from context if available
	ipAddress, _ := ctx.Value("client_ip").(string)
	userAgent, _ := ctx.Value("user_agent").(string)

	detailsJSON, _ := json.Marshal(details)

	auditLog := &AuditLog{
		OrganizationID: orgID,
		UserID:         actorUserID,
		TargetUserID:   targetUserID,
		Action:         action,
		ResourceType:   "user",
		ResourceID:     targetUserID,
		Details:        datatypes.JSON(detailsJSON),
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
		Success:        success,
		ErrorMessage:   errorMsg,
		CreatedAt:      time.Now(),
	}

	return s.db.Create(auditLog).Error
}

// LogSecurityEvent logs security-related events
func (s *AuditService) LogSecurityEvent(ctx context.Context, action AuditAction, userID string, details map[string]interface{}, success bool, errorMsg *string) error {
	orgID, _ := ctx.Value("organization_id").(string)
	ipAddress, _ := ctx.Value("client_ip").(string)
	userAgent, _ := ctx.Value("user_agent").(string)

	detailsJSON, _ := json.Marshal(details)

	auditLog := &AuditLog{
		OrganizationID: orgID,
		UserID:         userID,
		Action:         action,
		ResourceType:   "security",
		Details:        datatypes.JSON(detailsJSON),
		IPAddress:      ipAddress,
		UserAgent:      userAgent,
		Success:        success,
		ErrorMessage:   errorMsg,
		CreatedAt:      time.Now(),
	}

	return s.db.Create(auditLog).Error
}

// GetAuditLogs retrieves audit logs with filtering
func (s *AuditService) GetAuditLogs(ctx context.Context, filters map[string]interface{}, limit, offset int) ([]AuditLog, int64, error) {
	var logs []AuditLog
	var total int64

	query := s.db.Model(&AuditLog{})

	// Apply organization filter from context
	if orgID, ok := ctx.Value("organization_id").(string); ok {
		query = query.Where("organization_id = ?", orgID)
	}

	// Apply filters
	if userID, ok := filters["user_id"].(string); ok && userID != "" {
		query = query.Where("user_id = ?", userID)
	}
	if targetUserID, ok := filters["target_user_id"].(string); ok && targetUserID != "" {
		query = query.Where("target_user_id = ?", targetUserID)
	}
	if action, ok := filters["action"].(string); ok && action != "" {
		query = query.Where("action = ?", action)
	}
	if resourceType, ok := filters["resource_type"].(string); ok && resourceType != "" {
		query = query.Where("resource_type = ?", resourceType)
	}
	if success, ok := filters["success"].(bool); ok {
		query = query.Where("success = ?", success)
	}

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get records with pagination
	err := query.Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&logs).Error

	return logs, total, err
}

// GetUserAuditHistory gets audit history for a specific user
func (s *AuditService) GetUserAuditHistory(ctx context.Context, userID string, limit, offset int) ([]AuditLog, int64, error) {
	filters := map[string]interface{}{
		"target_user_id": userID,
	}
	return s.GetAuditLogs(ctx, filters, limit, offset)
}

// GetSecurityEvents gets security-related audit events
func (s *AuditService) GetSecurityEvents(ctx context.Context, limit, offset int) ([]AuditLog, int64, error) {
	filters := map[string]interface{}{
		"resource_type": "security",
	}
	return s.GetAuditLogs(ctx, filters, limit, offset)
}

// GetFailedActions gets failed action attempts
func (s *AuditService) GetFailedActions(ctx context.Context, limit, offset int) ([]AuditLog, int64, error) {
	filters := map[string]interface{}{
		"success": false,
	}
	return s.GetAuditLogs(ctx, filters, limit, offset)
}