package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"resource-mgmt/pkg/utils"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type MultiOrgAuthService struct {
	db *gorm.DB
}

func NewMultiOrgAuthService() *MultiOrgAuthService {
	return &MultiOrgAuthService{
		db: config.DB,
	}
}

// MultiOrgClaims represents JWT claims for multi-org authentication
type MultiOrgClaims struct {
	UserID                string                          `json:"user_id"`
	Email                 string                          `json:"email"`
	Name                  string                          `json:"name"`
	CurrentOrganizationID string                          `json:"current_organization_id,omitempty"`
	Organizations         []models.OrganizationMemberInfo `json:"organizations"`
	jwt.RegisteredClaims
}

// LoginRequest for multi-org authentication
type MultiOrgLoginRequest struct {
	Email            string `json:"email" binding:"required,email"`
	Password         string `json:"password" binding:"required"`
	OrganizationSlug string `json:"organization_slug,omitempty"` // Optional - for direct org login
}

// LoginResponse with multi-org context
type MultiOrgLoginResponse struct {
	Token               string                          `json:"token"`
	RefreshToken        string                          `json:"refresh_token"`
	User                *models.GlobalUser              `json:"user"`
	CurrentOrganization *models.Organization            `json:"current_organization,omitempty"`
	Organizations       []models.OrganizationMemberInfo `json:"organizations"`
}

// Login authenticates user and returns JWT with multi-org context
func (s *MultiOrgAuthService) Login(ctx context.Context, req *MultiOrgLoginRequest) (*MultiOrgLoginResponse, error) {
	// Find user by email
	var user models.GlobalUser
	err := s.db.Where("email = ? AND deleted_at IS NULL", req.Email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid email or password")
		}
		return nil, err
	}

	// Verify password
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	// Get user's organizations
	var memberships []models.OrganizationMember
	err = s.db.Preload("Organization").
		Where("user_id = ? AND status = ?", user.ID, "active").
		Find(&memberships).Error
	if err != nil {
		return nil, err
	}

	if len(memberships) == 0 {
		return nil, errors.New("user has no active organization memberships")
	}

	// Build organization info
	var organizations []models.OrganizationMemberInfo
	var currentOrg *models.Organization
	var currentOrgID string

	for _, m := range memberships {
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

		// Set current organization
		if req.OrganizationSlug != "" && m.Organization.Slug == req.OrganizationSlug {
			currentOrg = &m.Organization
			currentOrgID = m.OrganizationID
		} else if currentOrg == nil && m.IsPrimary {
			currentOrg = &m.Organization
			currentOrgID = m.OrganizationID
		}
	}

	// If no current org set, use the first one
	if currentOrg == nil && len(memberships) > 0 {
		currentOrg = &memberships[0].Organization
		currentOrgID = memberships[0].OrganizationID
	}

	// Update last login
	s.db.Model(&user).Update("last_login_at", time.Now())

	// Update last accessed for current org
	if currentOrgID != "" {
		s.db.Model(&models.OrganizationMember{}).
			Where("user_id = ? AND organization_id = ?", user.ID, currentOrgID).
			Update("last_accessed_at", time.Now())
	}

	// Generate tokens
	token, err := s.generateToken(&user, currentOrgID, organizations)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(&user)
	if err != nil {
		return nil, err
	}

	// Create session
	session := &models.UserSession{
		UserID:                user.ID,
		CurrentOrganizationID: &currentOrgID,
		Token:                 token,
		RefreshToken:          refreshToken,
		IPAddress:             "", // TODO: Get from context
		UserAgent:             "", // TODO: Get from context
		ExpiresAt:             time.Now().Add(24 * time.Hour),
	}
	s.db.Create(session)

	return &MultiOrgLoginResponse{
		Token:               token,
		RefreshToken:        refreshToken,
		User:                &user,
		CurrentOrganization: currentOrg,
		Organizations:       organizations,
	}, nil
}

// Register creates a new global user and organization
func (s *MultiOrgAuthService) Register(ctx context.Context, req *models.RegisterRequest) (*MultiOrgLoginResponse, error) {
	// Check if user already exists
	var existingUser models.GlobalUser
	err := s.db.Where("email = ?", req.Email).First(&existingUser).Error
	if err == nil {
		return nil, errors.New("email already registered")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Create global user
	user := &models.GlobalUser{
		Email:    req.Email,
		Name:     req.Name,
		Password: string(hashedPassword),
	}
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create organization
	org := &models.Organization{
		Name:   req.OrganizationName,
		Domain: req.OrganizationDomain,
		Slug:   s.generateSlug(req.OrganizationName),
		Plan:   "free",
	}
	if err := tx.Create(org).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create organization membership
	membership := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: org.ID,
		Role:           "admin",
		IsOrgAdmin:     true,
		IsPrimary:      true,
		Status:         "active",
	}
	if err := tx.Create(membership).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Prepare response
	orgInfo := []models.OrganizationMemberInfo{
		{
			OrganizationID:   org.ID,
			OrganizationName: org.Name,
			OrganizationSlug: org.Slug,
			Role:             "admin",
			IsOrgAdmin:       true,
			IsPrimary:        true,
			JoinedAt:         membership.JoinedAt,
		},
	}

	// Generate tokens
	token, err := s.generateToken(user, org.ID, orgInfo)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &MultiOrgLoginResponse{
		Token:               token,
		RefreshToken:        refreshToken,
		User:                user,
		CurrentOrganization: org,
		Organizations:       orgInfo,
	}, nil
}

// SwitchOrganization changes the user's current organization context
func (s *MultiOrgAuthService) SwitchOrganization(ctx context.Context, userID, newOrgID string) (*MultiOrgLoginResponse, error) {
	// Verify user has access to the organization
	var membership models.OrganizationMember
	err := s.db.Preload("Organization").Preload("User").
		Where("user_id = ? AND organization_id = ? AND status = ?", userID, newOrgID, "active").
		First(&membership).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user does not have access to this organization")
		}
		return nil, err
	}

	// Get all user's organizations
	var memberships []models.OrganizationMember
	err = s.db.Preload("Organization").
		Where("user_id = ? AND status = ?", userID, "active").
		Find(&memberships).Error
	if err != nil {
		return nil, err
	}

	// Build organization info
	var organizations []models.OrganizationMemberInfo
	for _, m := range memberships {
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

	// Update last accessed
	s.db.Model(&models.OrganizationMember{}).
		Where("user_id = ? AND organization_id = ?", userID, newOrgID).
		Update("last_accessed_at", time.Now())

	// Generate new token with updated context
	token, err := s.generateToken(&membership.User, newOrgID, organizations)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(&membership.User)
	if err != nil {
		return nil, err
	}

	return &MultiOrgLoginResponse{
		Token:               token,
		RefreshToken:        refreshToken,
		User:                &membership.User,
		CurrentOrganization: &membership.Organization,
		Organizations:       organizations,
	}, nil
}

// GetUserOrganizations returns all organizations a user belongs to
func (s *MultiOrgAuthService) GetUserOrganizations(ctx context.Context, userID string) ([]models.OrganizationMemberInfo, error) {
	var memberships []models.OrganizationMember
	err := s.db.Preload("Organization").
		Where("user_id = ? AND status = ?", userID, "active").
		Find(&memberships).Error
	if err != nil {
		return nil, err
	}

	var organizations []models.OrganizationMemberInfo
	for _, m := range memberships {
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

// Helper functions
func (s *MultiOrgAuthService) generateToken(user *models.GlobalUser, currentOrgID string, orgs []models.OrganizationMemberInfo) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &MultiOrgClaims{
		UserID:                user.ID,
		Email:                 user.Email,
		Name:                  user.Name,
		CurrentOrganizationID: currentOrgID,
		Organizations:         orgs,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "resource-mgmt",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	// Use secure JWT secret management
	secretBytes, err := utils.GetJWTSecret()
	if err != nil {
		return "", fmt.Errorf("failed to get JWT secret: %w", err)
	}
	return token.SignedString(secretBytes)
}

func (s *MultiOrgAuthService) generateRefreshToken(user *models.GlobalUser) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *MultiOrgAuthService) generateSlug(name string) string {
	// Simple slug generation - in production, should check for uniqueness
	slug := strings.ToLower(name)
	slug = strings.ReplaceAll(slug, " ", "-")
	slug = strings.ReplaceAll(slug, ".", "")
	// Add timestamp to ensure uniqueness
	return fmt.Sprintf("%s-%d", slug, time.Now().Unix())
}

// GetUsersWithFilters returns users in the current organization with filtering
func (s *MultiOrgAuthService) GetUsersWithFilters(ctx context.Context, orgID string, filters map[string]interface{}, limit, offset int) ([]models.GlobalUser, int64, error) {
	query := s.db.Model(&models.GlobalUser{}).
		Joins("JOIN organization_members ON global_users.id = organization_members.user_id").
		Where("organization_members.organization_id = ? AND organization_members.status = ?", orgID, "active").
		Where("global_users.deleted_at IS NULL")

	// Apply filters
	if role, ok := filters["role"]; ok {
		query = query.Where("organization_members.role = ?", role)
	}
	if status, ok := filters["status"]; ok {
		query = query.Where("organization_members.status = ?", status)
	}

	// Count total
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get users with pagination
	var users []models.GlobalUser
	err := query.Preload("Memberships", "organization_id = ? AND status = ?", orgID, "active").
		Limit(limit).
		Offset(offset).
		Find(&users).Error
	if err != nil {
		return nil, 0, err
	}

	// Populate computed fields for each user based on current organization context
	for i := range users {
		// Find the membership for the current organization
		for _, membership := range users[i].Memberships {
			if membership.OrganizationID == orgID {
				users[i].Role = membership.Role
				users[i].Status = membership.Status
				users[i].IsOrgAdmin = membership.IsOrgAdmin
				users[i].OrganizationID = membership.OrganizationID

				// Set last active time (prefer membership last_accessed_at over user last_login_at)
				if membership.LastAccessedAt != nil {
					lastActive := membership.LastAccessedAt.Format("2006-01-02T15:04:05Z07:00")
					users[i].LastActive = &lastActive
				} else if users[i].LastLoginAt != nil {
					lastActive := users[i].LastLoginAt.Format("2006-01-02T15:04:05Z07:00")
					users[i].LastActive = &lastActive
				}

				// Convert permissions JSON to bytes for compatibility
				if len(membership.Permissions) > 0 {
					users[i].Permissions = []byte(membership.Permissions)
				} else {
					users[i].Permissions = []byte("{}")
				}

				// TODO: Get actual inspections count from database
				users[i].InspectionsCount = 0

				break
			}
		}

		// If no membership found, set default values
		if users[i].Role == "" {
			users[i].Role = "inspector"
			users[i].Status = "active"
			users[i].IsOrgAdmin = false
			users[i].OrganizationID = orgID
			users[i].Permissions = []byte("{}")
			users[i].InspectionsCount = 0
		}
	}

	return users, total, nil
}

// GetUserByID returns a user by ID within the organization context
func (s *MultiOrgAuthService) GetUserByID(ctx context.Context, userID, orgID string) (*models.GlobalUser, error) {
	var user models.GlobalUser
	err := s.db.Preload("Memberships").
		Joins("JOIN organization_members ON global_users.id = organization_members.user_id").
		Where("global_users.id = ? AND organization_members.organization_id = ? AND organization_members.status = ?", userID, orgID, "active").
		Where("global_users.deleted_at IS NULL").
		First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}
	return &user, nil
}

// GetOrganizationAdminCount returns the count of admin users in the organization
func (s *MultiOrgAuthService) GetOrganizationAdminCount(ctx context.Context, orgID string) (int64, error) {
	var count int64
	err := s.db.Model(&models.OrganizationMember{}).
		Where("organization_id = ? AND role = ? AND status = ?", orgID, "admin", "active").
		Count(&count).Error
	return count, err
}

// GetActiveAdminCount returns the count of active admin users in the organization
func (s *MultiOrgAuthService) GetActiveAdminCount(ctx context.Context, orgID string) (int64, error) {
	var count int64
	err := s.db.Model(&models.OrganizationMember{}).
		Joins("JOIN global_users ON organization_members.user_id = global_users.id").
		Where("organization_members.organization_id = ? AND organization_members.role = ? AND organization_members.status = ?", orgID, "admin", "active").
		Where("global_users.deleted_at IS NULL").
		Count(&count).Error
	return count, err
}

// CreateUser creates a new user and adds them to the organization
func (s *MultiOrgAuthService) CreateUser(ctx context.Context, orgID string, req *models.CreateUserRequest) (*models.GlobalUser, error) {
	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Check if user already exists
	var existingUser models.GlobalUser
	err = tx.Where("email = ?", req.Email).First(&existingUser).Error
	if err == nil {
		tx.Rollback()
		return nil, errors.New("email already registered")
	}

	// Create global user
	user := &models.GlobalUser{
		Email:    req.Email,
		Name:     req.Name,
		Password: string(hashedPassword),
	}
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Create organization membership
	membership := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: orgID,
		Role:           req.Role,
		IsOrgAdmin:     req.Role == "admin",
		Status:         "active",
	}
	if err := tx.Create(membership).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return user, nil
}

// UpdateUser updates a user's information
func (s *MultiOrgAuthService) UpdateUser(ctx context.Context, userID, orgID string, req *models.UpdateUserRequest) (*models.GlobalUser, error) {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Get user
	var user models.GlobalUser
	err := tx.Where("id = ?", userID).First(&user).Error
	if err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("user not found")
		}
		return nil, err
	}

	// Update user fields
	if req.Name != "" {
		user.Name = req.Name
	}

	if err := tx.Save(&user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Update organization membership
	membershipUpdates := make(map[string]interface{})
	if req.Role != "" {
		membershipUpdates["role"] = req.Role
		membershipUpdates["is_org_admin"] = req.Role == "admin"
	}
	if req.Status != nil {
		membershipUpdates["status"] = *req.Status
	}

	if len(membershipUpdates) > 0 {
		err = tx.Model(&models.OrganizationMember{}).
			Where("user_id = ? AND organization_id = ?", userID, orgID).
			Updates(membershipUpdates).Error
		if err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return &user, nil
}

// DeleteUser deletes a user from the organization
func (s *MultiOrgAuthService) DeleteUser(ctx context.Context, userID, orgID string) error {
	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Remove organization membership
	err := tx.Where("user_id = ? AND organization_id = ?", userID, orgID).
		Delete(&models.OrganizationMember{}).Error
	if err != nil {
		tx.Rollback()
		return err
	}

	// Check if user has other active memberships
	var membershipCount int64
	err = tx.Model(&models.OrganizationMember{}).
		Where("user_id = ? AND status = ?", userID, "active").
		Count(&membershipCount).Error
	if err != nil {
		tx.Rollback()
		return err
	}

	// If no other active memberships, soft delete the global user
	if membershipCount == 0 {
		err = tx.Model(&models.GlobalUser{}).
			Where("id = ?", userID).
			Update("deleted_at", time.Now()).Error
		if err != nil {
			tx.Rollback()
			return err
		}
	}

	// Commit transaction
	return tx.Commit().Error
}