package services

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

type InvitationService struct {
	db                  *gorm.DB
	notificationService *NotificationService
}

func NewInvitationService() *InvitationService {
	return &InvitationService{
		db:                  config.DB,
		notificationService: NewNotificationService(),
	}
}

// InviteUserRequest for inviting users to organization
type InviteUserRequest struct {
	Email       string                 `json:"email" binding:"required,email"`
	Role        string                 `json:"role" binding:"required"`
	Permissions map[string]interface{} `json:"permissions"`
	Message     string                 `json:"message"`
}

// AcceptInvitationRequest for accepting an invitation
type AcceptInvitationRequest struct {
	Token    string `json:"token" binding:"required"`
	Password string `json:"password,omitempty"` // Required for new users
	Name     string `json:"name,omitempty"`     // Required for new users
}

// InviteUser sends an invitation to join an organization
func (s *InvitationService) InviteUser(ctx context.Context, orgID string, inviterID string, req *InviteUserRequest) (*models.OrganizationInvitation, error) {
	// Check if user is already a member
	var existingMember models.OrganizationMember
	err := s.db.Joins("JOIN global_users ON global_users.id = organization_members.user_id").
		Where("global_users.email = ? AND organization_members.organization_id = ?", req.Email, orgID).
		First(&existingMember).Error

	if err == nil {
		return nil, errors.New("user is already a member of this organization")
	}

	// Check for pending invitation
	var existingInvite models.OrganizationInvitation
	err = s.db.Where("email = ? AND organization_id = ? AND expires_at > ? AND accepted_at IS NULL",
		req.Email, orgID, time.Now()).
		First(&existingInvite).Error

	if err == nil {
		return nil, errors.New("an invitation is already pending for this email")
	}

	// Generate invitation token
	token, err := s.generateInvitationToken()
	if err != nil {
		return nil, err
	}

	// Create invitation
	invitation := &models.OrganizationInvitation{
		Email:          req.Email,
		OrganizationID: orgID,
		InvitedBy:      inviterID,
		Role:           req.Role,
		Token:          token,
		Message:        req.Message,
		ExpiresAt:      time.Now().Add(7 * 24 * time.Hour), // 7 days expiration
	}

	if err := s.db.Create(invitation).Error; err != nil {
		return nil, err
	}

	// Load relationships
	s.db.Preload("Organization").Preload("InvitedByUser").First(invitation, invitation.ID)

	// Send invitation email
	go s.sendInvitationEmail(invitation)

	return invitation, nil
}

// AcceptInvitation accepts an organization invitation
func (s *InvitationService) AcceptInvitation(ctx context.Context, req *AcceptInvitationRequest) (*models.OrganizationMember, error) {
	// Find invitation by token
	var invitation models.OrganizationInvitation
	err := s.db.Preload("Organization").
		Where("token = ? AND expires_at > ? AND accepted_at IS NULL", req.Token, time.Now()).
		First(&invitation).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invitation not found or expired")
		}
		return nil, err
	}

	// Start transaction
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// Check if user exists
	var user models.GlobalUser
	err = tx.Where("email = ?", invitation.Email).First(&user).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// Create new user
			if req.Password == "" || req.Name == "" {
				tx.Rollback()
				return nil, errors.New("password and name are required for new users")
			}

			hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
			if err != nil {
				tx.Rollback()
				return nil, err
			}

			user = models.GlobalUser{
				Email:         invitation.Email,
				Name:          req.Name,
				Password:      string(hashedPassword),
				EmailVerified: true,
				EmailVerifiedAt: &[]time.Time{time.Now()}[0],
			}

			if err := tx.Create(&user).Error; err != nil {
				tx.Rollback()
				return nil, err
			}
		} else {
			tx.Rollback()
			return nil, err
		}
	}

	// Create organization membership
	membership := &models.OrganizationMember{
		UserID:         user.ID,
		OrganizationID: invitation.OrganizationID,
		Role:           invitation.Role,
		Permissions:    invitation.Permissions,
		InvitedBy:      &invitation.InvitedBy,
		Status:         "active",
	}

	// Check if this is user's first organization
	var membershipCount int64
	tx.Model(&models.OrganizationMember{}).Where("user_id = ?", user.ID).Count(&membershipCount)
	if membershipCount == 0 {
		membership.IsPrimary = true
	}

	if err := tx.Create(membership).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Update invitation
	now := time.Now()
	invitation.AcceptedAt = &now
	invitation.AcceptedBy = &user.ID
	if err := tx.Save(&invitation).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// Load relationships
	s.db.Preload("User").Preload("Organization").First(membership, membership.ID)

	return membership, nil
}

// GetPendingInvitations returns all pending invitations for an organization
func (s *InvitationService) GetPendingInvitations(ctx context.Context, orgID string) ([]models.OrganizationInvitation, error) {
	var invitations []models.OrganizationInvitation
	err := s.db.Preload("InvitedByUser").
		Where("organization_id = ? AND expires_at > ? AND accepted_at IS NULL", orgID, time.Now()).
		Order("created_at DESC").
		Find(&invitations).Error

	return invitations, err
}

// CancelInvitation cancels a pending invitation
func (s *InvitationService) CancelInvitation(ctx context.Context, invitationID string, cancellerID string) error {
	var invitation models.OrganizationInvitation
	err := s.db.Where("id = ? AND accepted_at IS NULL", invitationID).First(&invitation).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("invitation not found or already accepted")
		}
		return err
	}

	// Soft delete the invitation
	return s.db.Delete(&invitation).Error
}

// ResendInvitation resends an invitation email
func (s *InvitationService) ResendInvitation(ctx context.Context, invitationID string) error {
	var invitation models.OrganizationInvitation
	err := s.db.Preload("Organization").Preload("InvitedByUser").
		Where("id = ? AND accepted_at IS NULL AND expires_at > ?", invitationID, time.Now()).
		First(&invitation).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("invitation not found, already accepted, or expired")
		}
		return err
	}

	// Extend expiration
	invitation.ExpiresAt = time.Now().Add(7 * 24 * time.Hour)
	s.db.Save(&invitation)

	// Resend email
	go s.sendInvitationEmail(&invitation)

	return nil
}

// Helper functions
func (s *InvitationService) generateInvitationToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func (s *InvitationService) sendInvitationEmail(invitation *models.OrganizationInvitation) {
	// TODO: Implement email sending
	// This would integrate with your email service (SendGrid, AWS SES, etc.)

	inviteURL := fmt.Sprintf("https://app.resourcemgmt.com/invite/accept?token=%s", invitation.Token)

	emailContent := fmt.Sprintf(`
		You've been invited to join %s on Resource Management.

		Invited by: %s
		Role: %s

		%s

		Click here to accept: %s

		This invitation expires in 7 days.
	`,
		invitation.Organization.Name,
		invitation.InvitedByUser.Name,
		invitation.Role,
		invitation.Message,
		inviteURL,
	)

	// Log for now
	fmt.Printf("Sending invitation email to %s:\n%s\n", invitation.Email, emailContent)

	// In production, use actual email service:
	// s.notificationService.SendEmail(invitation.Email, "Organization Invitation", emailContent)
}