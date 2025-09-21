package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"regexp"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"resource-mgmt/utils"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type OrganizationService struct {
	db *gorm.DB
}

func NewOrganizationService() *OrganizationService {
	return &OrganizationService{
		db: config.DB,
	}
}

// CreateOrganization creates a new organization with admin user
func (s *OrganizationService) CreateOrganization(req *models.CreateOrganizationRequest) (*models.Organization, *models.GlobalUser, error) {
	if s.db == nil {
		return nil, nil, errors.New("database connection not available")
	}

	// Validate domain format
	if !isValidDomain(req.Domain) {
		return nil, nil, errors.New("invalid domain format")
	}

	// Check if domain is already taken
	var existingOrg models.Organization
	err := s.db.Where("domain = ?", strings.ToLower(req.Domain)).First(&existingOrg).Error
	if err == nil {
		return nil, nil, errors.New("domain already exists")
	}

	// Start transaction
	tx := s.db.Begin()

	// Set default plan
	plan := req.Plan
	if plan == "" {
		plan = "free"
	}

	// Create organization
	org := &models.Organization{
		Name:     req.OrganizationName,
		Domain:   strings.ToLower(req.Domain),
		Plan:     plan,
		IsActive: true,
		Settings: datatypes.JSON([]byte("{}")),
	}

	err = tx.Create(org).Error
	if err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create organization: %v", err)
	}

	// Hash admin password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.AdminPassword), bcrypt.DefaultCost)
	if err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to hash password: %v", err)
	}

	// Create admin user
	adminPermissions := utils.GetDefaultPermissions("admin")
	permissionsJSON, err := json.Marshal(adminPermissions)
	if err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to marshal permissions: %v", err)
	}

	adminUser := &models.GlobalUser{
		Name:     req.AdminName,
		Email:    strings.ToLower(req.AdminEmail),
		Password: string(hashedPassword),
	}

	err = tx.Create(adminUser).Error
	if err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create admin user: %v", err)
	}

	// Create organization membership for admin user
	membership := &models.OrganizationMember{
		UserID:         adminUser.ID,
		OrganizationID: org.ID,
		Role:           "admin",
		Permissions:    datatypes.JSON(permissionsJSON),
		IsOrgAdmin:     true,
		IsPrimary:      true,
		Status:         "active",
	}

	err = tx.Create(membership).Error
	if err != nil {
		tx.Rollback()
		return nil, nil, fmt.Errorf("failed to create admin membership: %v", err)
	}

	// Commit transaction
	tx.Commit()

	// Create default templates for the new organization
	templateSeeder := NewTemplateSeeder(s.db)
	if err := templateSeeder.SeedTemplatesForOrganization(org.ID); err != nil {
		// Log error but don't fail organization creation
		fmt.Printf("Warning: Failed to create default templates for organization %s: %v\n", org.ID, err)
	}

	// Clear relationships to avoid lazy loading issues during JSON serialization
	org.Templates = nil
	org.Inspections = nil
	org.Notifications = nil

	// Return the created organization and admin user
	return org, adminUser, nil
}

// GetOrganizationByID retrieves organization by ID
func (s *OrganizationService) GetOrganizationByID(id string) (*models.Organization, error) {
	if s.db == nil {
		return nil, errors.New("database connection not available")
	}

	var org models.Organization
	err := s.db.Preload("Users").First(&org, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("organization not found")
		}
		return nil, err
	}

	return &org, nil
}

// GetOrganizationByDomain retrieves organization by domain
func (s *OrganizationService) GetOrganizationByDomain(domain string) (*models.Organization, error) {
	if s.db == nil {
		return nil, errors.New("database connection not available")
	}

	var org models.Organization
	err := s.db.Where("domain = ?", strings.ToLower(domain)).First(&org).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("organization not found")
		}
		return nil, err
	}

	return &org, nil
}

// UpdateOrganization updates organization details
func (s *OrganizationService) UpdateOrganization(id string, req *models.UpdateOrganizationRequest) (*models.Organization, error) {
	if s.db == nil {
		return nil, errors.New("database connection not available")
	}

	var org models.Organization
	err := s.db.First(&org, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("organization not found")
		}
		return nil, err
	}

	// Update fields
	updates := make(map[string]interface{})

	if req.Name != "" {
		updates["name"] = req.Name
	}

	if req.Plan != "" {
		updates["plan"] = req.Plan
	}

	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if req.Settings != nil {
		settingsJSON, err := json.Marshal(req.Settings)
		if err == nil {
			updates["settings"] = datatypes.JSON(settingsJSON)
		}
	}

	if len(updates) > 0 {
		err = s.db.Model(&org).Updates(updates).Error
		if err != nil {
			return nil, err
		}
	}

	// Reload with relationships
	err = s.db.Preload("Users").First(&org, id).Error
	if err != nil {
		return nil, err
	}

	return &org, nil
}

// InviteUser creates an invitation for a user to join the organization
func (s *OrganizationService) InviteUser(orgID string, req *models.InviteUserRequest, invitedBy string) (*models.GlobalUser, error) {
	if s.db == nil {
		return nil, errors.New("database connection not available")
	}

	// Verify organization exists
	var org models.Organization
	err := s.db.First(&org, orgID).Error
	if err != nil {
		return nil, errors.New("organization not found")
	}

	// Check if user already exists in this organization
	var existingUser models.GlobalUser
	err = s.db.Where("organization_id = ? AND email = ?", orgID, strings.ToLower(req.Email)).First(&existingUser).Error
	if err == nil {
		return nil, errors.New("user already exists in this organization")
	}

	// Set default role if not provided
	role := req.Role
	if role == "" {
		role = "inspector"
	}

	// Generate default permissions
	permissions := utils.GetDefaultPermissions(role)
	permissionsJSON, err := json.Marshal(permissions)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal permissions: %v", err)
	}

	// Create user (password will be set when they accept invitation)
	user := &models.GlobalUser{
		Name:  req.Name,
		Email: strings.ToLower(req.Email),
	}

	err = s.db.Create(user).Error
	if err != nil {
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	// Create organization membership for the user
	membership := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: orgID,
		Role:           role,
		Permissions:    datatypes.JSON(permissionsJSON),
		IsOrgAdmin:     false,
		IsPrimary:      false,
		Status:         "pending", // Since this is an invitation
	}

	err = s.db.Create(membership).Error
	if err != nil {
		return nil, fmt.Errorf("failed to create user membership: %v", err)
	}

	// TODO: Send invitation email
	// This would integrate with your email service to send invitation links

	return user, nil
}

// ListOrganizations returns all organizations (for system admin)
func (s *OrganizationService) ListOrganizations(limit, offset int) ([]models.Organization, int64, error) {
	if s.db == nil {
		return nil, 0, errors.New("database connection not available")
	}

	var orgs []models.Organization
	var total int64

	err := s.db.Model(&models.Organization{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = s.db.Preload("Users").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&orgs).Error

	if err != nil {
		return nil, 0, err
	}

	return orgs, total, nil
}

// Helper functions

func isValidDomain(domain string) bool {
	// Domain should be 3-50 characters, alphanumeric and hyphens, not start/end with hyphen
	regex := regexp.MustCompile(`^[a-z0-9]([a-z0-9-]{1,48}[a-z0-9])?$`)
	return regex.MatchString(strings.ToLower(domain))
}
