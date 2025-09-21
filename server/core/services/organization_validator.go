package services

import (
	"context"
	"errors"
	"fmt"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"time"

	"gorm.io/gorm"
)

var (
	// ErrUserNotFound is returned when user doesn't exist
	ErrUserNotFound = errors.New("user not found")
	// ErrOrganizationNotFound is returned when organization doesn't exist
	ErrOrganizationNotFound = errors.New("organization not found")
	// ErrUserNotMemberOfOrg is returned when user is not a member of organization
	ErrUserNotMemberOfOrg = errors.New("user is not a member of this organization")
	// ErrMembershipInactive is returned when membership is inactive
	ErrMembershipInactive = errors.New("user membership is inactive")
	// ErrOrganizationSuspended is returned when organization is suspended
	ErrOrganizationSuspended = errors.New("organization is suspended")
	// ErrInsufficientPrivileges is returned when user lacks required privileges
	ErrInsufficientPrivileges = errors.New("insufficient privileges for this operation")
)

// OrganizationValidator provides database-backed validation for organization access
type OrganizationValidator struct {
	db *gorm.DB
}

// NewOrganizationValidator creates a new organization validator
func NewOrganizationValidator() *OrganizationValidator {
	return &OrganizationValidator{
		db: config.DB,
	}
}

// ValidatedOrganizationContext contains validated organization context
type ValidatedOrganizationContext struct {
	User           *models.GlobalUser       `json:"user"`
	Organization   *models.Organization     `json:"organization"`
	Membership     *models.OrganizationMember `json:"membership"`
	IsAdmin        bool                     `json:"is_admin"`
	CanAccessAll   bool                     `json:"can_access_all"`
	Permissions    map[string]interface{}   `json:"permissions"`
	LastAccessed   *time.Time               `json:"last_accessed"`
}

// ValidateUserOrganizationAccess validates a user's access to an organization with database checks
func (v *OrganizationValidator) ValidateUserOrganizationAccess(ctx context.Context, userID, organizationID string) (*ValidatedOrganizationContext, error) {
	// Validate user exists and is active
	var user models.GlobalUser
	err := v.db.Where("id = ? AND deleted_at IS NULL", userID).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}

	// Validate organization exists and is active
	var org models.Organization
	err = v.db.Where("id = ? AND deleted_at IS NULL", organizationID).First(&org).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrOrganizationNotFound
		}
		return nil, fmt.Errorf("failed to fetch organization: %w", err)
	}

	// Check if organization is suspended (using IsActive field)
	if !org.IsActive {
		return nil, ErrOrganizationSuspended
	}

	// Validate membership exists and is active
	var membership models.OrganizationMember
	err = v.db.Where("user_id = ? AND organization_id = ?", userID, organizationID).
		First(&membership).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotMemberOfOrg
		}
		return nil, fmt.Errorf("failed to fetch membership: %w", err)
	}

	// Check membership status
	if membership.Status != "active" {
		return nil, ErrMembershipInactive
	}

	// Update last accessed timestamp
	now := time.Now()
	v.db.Model(&membership).Update("last_accessed_at", &now)

	// Build validated context
	context := &ValidatedOrganizationContext{
		User:         &user,
		Organization: &org,
		Membership:   &membership,
		IsAdmin:      membership.IsOrgAdmin || membership.Role == "admin",
		CanAccessAll: membership.Role == "admin" || membership.Role == "supervisor",
		Permissions:  v.getPermissionsForRole(membership.Role),
		LastAccessed: &now,
	}

	return context, nil
}

// ValidateOperationPermission checks if user has permission for specific operation
func (v *OrganizationValidator) ValidateOperationPermission(ctx *ValidatedOrganizationContext, operation string) error {
	if ctx == nil {
		return ErrInsufficientPrivileges
	}

	// Admin can do everything
	if ctx.IsAdmin {
		return nil
	}

	// Check specific permission
	if permission, exists := ctx.Permissions[operation]; exists {
		if allowed, ok := permission.(bool); ok && allowed {
			return nil
		}
	}

	return fmt.Errorf("%w: missing permission '%s'", ErrInsufficientPrivileges, operation)
}

// ValidateResourceAccess checks if user can access a specific resource
func (v *OrganizationValidator) ValidateResourceAccess(userID, organizationID, resourceType, resourceID string) error {
	// Validate basic organization access first
	context, err := v.ValidateUserOrganizationAccess(context.Background(), userID, organizationID)
	if err != nil {
		return err
	}

	// If user can access all data, allow
	if context.CanAccessAll {
		return nil
	}

	// Resource-specific validation
	switch resourceType {
	case "inspection":
		return v.validateInspectionAccess(context, resourceID)
	case "template":
		return v.validateTemplateAccess(context, resourceID)
	case "site":
		return v.validateSiteAccess(context, resourceID)
	default:
		return fmt.Errorf("unknown resource type: %s", resourceType)
	}
}

// ValidateUserExistsInOrganization quickly checks if user exists in organization
func (v *OrganizationValidator) ValidateUserExistsInOrganization(userID, organizationID string) error {
	var count int64
	err := v.db.Model(&models.OrganizationMember{}).
		Where("user_id = ? AND organization_id = ? AND status = ?", userID, organizationID, "active").
		Count(&count).Error

	if err != nil {
		return fmt.Errorf("failed to check membership: %w", err)
	}

	if count == 0 {
		return ErrUserNotMemberOfOrg
	}

	return nil
}

// GetUserActiveOrganizations returns all active organizations for a user
func (v *OrganizationValidator) GetUserActiveOrganizations(userID string) ([]models.OrganizationMemberInfo, error) {
	var memberships []models.OrganizationMember
	err := v.db.Preload("Organization").
		Where("user_id = ? AND status = ?", userID, "active").
		Find(&memberships).Error
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user organizations: %w", err)
	}

	var organizations []models.OrganizationMemberInfo
	for _, m := range memberships {
		// Skip suspended organizations
		if !m.Organization.IsActive {
			continue
		}

		orgInfo := models.OrganizationMemberInfo{
			OrganizationID:   m.OrganizationID,
			OrganizationName: m.Organization.Name,
			OrganizationSlug: m.Organization.Slug,
			Role:             m.Role,
			IsOrgAdmin:       m.IsOrgAdmin,
			IsPrimary:        m.IsPrimary,
			JoinedAt:         m.JoinedAt,
			LastAccessedAt:   m.LastAccessedAt,
		}
		organizations = append(organizations, orgInfo)
	}

	return organizations, nil
}

// validateInspectionAccess checks if user can access specific inspection
func (v *OrganizationValidator) validateInspectionAccess(context *ValidatedOrganizationContext, inspectionID string) error {
	// If user can view all inspections, allow
	if permission, exists := context.Permissions["can_view_all_inspections"]; exists {
		if allowed, ok := permission.(bool); ok && allowed {
			return nil
		}
	}

	// Check if user owns the inspection
	var inspection models.Inspection
	err := v.db.Select("inspector_id, organization_id").
		Where("id = ? AND organization_id = ?", inspectionID, context.Organization.ID).
		First(&inspection).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("inspection not found or access denied")
		}
		return fmt.Errorf("failed to check inspection ownership: %w", err)
	}

	// Allow if user is the inspector assigned to the inspection
	if inspection.InspectorID == context.User.ID {
		return nil
	}

	return ErrInsufficientPrivileges
}

// validateTemplateAccess checks if user can access specific template
func (v *OrganizationValidator) validateTemplateAccess(context *ValidatedOrganizationContext, templateID string) error {
	// Check template management or creation permissions
	if permission, exists := context.Permissions["can_manage_templates"]; exists {
		if allowed, ok := permission.(bool); ok && allowed {
			return nil
		}
	}

	// Also allow access for users who can create templates
	if permission, exists := context.Permissions["can_create_templates"]; exists {
		if allowed, ok := permission.(bool); ok && allowed {
			return nil
		}
	}

	// All users can typically view templates in their org
	var count int64
	err := v.db.Model(&models.Template{}).
		Where("id = ? AND organization_id = ?", templateID, context.Organization.ID).
		Count(&count).Error

	if err != nil {
		return fmt.Errorf("failed to check template access: %w", err)
	}

	if count == 0 {
		return errors.New("template not found or access denied")
	}

	return nil
}

// validateSiteAccess checks if user can access specific site
func (v *OrganizationValidator) validateSiteAccess(context *ValidatedOrganizationContext, siteID string) error {
	// Check if site exists in user's organization
	var count int64
	err := v.db.Model(&models.Site{}).
		Where("id = ? AND organization_id = ?", siteID, context.Organization.ID).
		Count(&count).Error

	if err != nil {
		return fmt.Errorf("failed to check site access: %w", err)
	}

	if count == 0 {
		return errors.New("site not found or access denied")
	}

	return nil
}

// getPermissionsForRole returns permissions for a given role
func (v *OrganizationValidator) getPermissionsForRole(role string) map[string]interface{} {
	switch role {
	case "admin":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_all_inspections": true,
			"can_edit_inspections":     true,
			"can_delete_inspections":   true,
			"can_manage_templates":     true,
			"can_manage_users":         true,
			"can_view_reports":         true,
			"can_export_reports":       true,
			"can_manage_organization":  true,
			"can_manage_sites":         true,
		}
	case "supervisor":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_all_inspections": true,
			"can_edit_inspections":     true,
			"can_delete_inspections":   false,
			"can_manage_templates":     true,
			"can_manage_users":         false,
			"can_view_reports":         true,
			"can_export_reports":       true,
			"can_manage_organization":  false,
			"can_manage_sites":         true,
		}
	case "inspector":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_all_inspections": false,
			"can_edit_inspections":     true,
			"can_delete_inspections":   false,
			"can_manage_templates":     false,
			"can_manage_users":         false,
			"can_view_reports":         false,
			"can_export_reports":       false,
			"can_manage_organization":  false,
			"can_manage_sites":         false,
		}
	default:
		return map[string]interface{}{
			"can_create_inspections":   false,
			"can_view_all_inspections": false,
			"can_edit_inspections":     false,
			"can_delete_inspections":   false,
			"can_manage_templates":     false,
			"can_manage_users":         false,
			"can_view_reports":         false,
			"can_export_reports":       false,
			"can_manage_organization":  false,
			"can_manage_sites":         false,
		}
	}
}