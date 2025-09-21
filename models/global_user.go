package models

import (
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"time"
)

// GlobalUser represents a user that can belong to multiple organizations
type GlobalUser struct {
	ID              string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	Email           string         `json:"email" gorm:"size:255;unique;not null"`
	Name            string         `json:"name" gorm:"size:255;not null"`
	Password        string         `json:"-" gorm:"size:255"` // Hidden from JSON
	AvatarURL       string         `json:"avatar_url" gorm:"size:500"`
	Phone           string         `json:"phone" gorm:"size:50"`
	EmailVerified   bool           `json:"email_verified" gorm:"default:false"`
	EmailVerifiedAt *time.Time     `json:"email_verified_at"`
	LastLoginAt     *time.Time     `json:"last_login_at"`
	Preferences     datatypes.JSON `json:"preferences" gorm:"type:jsonb;default:'{}'"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// Relationships
	Memberships []OrganizationMember `json:"memberships" gorm:"foreignKey:UserID"`

	// Computed fields for backward compatibility (populated by methods)
	Role             string  `json:"role" gorm:"-"`
	Status           string  `json:"status" gorm:"-"`
	Permissions      []byte  `json:"permissions" gorm:"-"`
	IsOrgAdmin       bool    `json:"is_org_admin" gorm:"-"`
	LastActive       *string `json:"lastActive" gorm:"-"`
	InspectionsCount int     `json:"inspectionsCount" gorm:"-"`
	OrganizationID   string  `json:"organization_id" gorm:"-"`
}

// Helper methods for backward compatibility
func (u *GlobalUser) GetRole() string {
	// Return the role from the primary organization membership
	for _, membership := range u.Memberships {
		if membership.IsPrimary {
			return membership.Role
		}
	}
	// If no primary, return the first active membership role
	for _, membership := range u.Memberships {
		if membership.Status == "active" {
			return membership.Role
		}
	}
	return "inspector" // default role
}

func (u *GlobalUser) GetPermissions() datatypes.JSON {
	// Return the permissions from the primary organization membership
	for _, membership := range u.Memberships {
		if membership.IsPrimary {
			return membership.Permissions
		}
	}
	// If no primary, return the first active membership permissions
	for _, membership := range u.Memberships {
		if membership.Status == "active" {
			return membership.Permissions
		}
	}
	return datatypes.JSON("{}")
}

// PopulateComputedFields fills the computed fields based on memberships
func (u *GlobalUser) PopulateComputedFields() {
	u.Role = u.GetRole()

	perms := u.GetPermissions()
	if len(perms) == 0 {
		u.Permissions = []byte("{}")
	} else {
		u.Permissions = []byte(perms)
	}

	u.OrganizationID = u.GetPrimaryOrganizationID()
}

// Helper method to get primary organization ID
func (u *GlobalUser) GetPrimaryOrganizationID() string {
	for _, membership := range u.Memberships {
		if membership.IsPrimary {
			return membership.OrganizationID
		}
	}
	// If no primary, return the first active membership
	for _, membership := range u.Memberships {
		if membership.Status == "active" {
			return membership.OrganizationID
		}
	}
	return ""
}

// OrganizationMember represents a user's membership in an organization
type OrganizationMember struct {
	ID             string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	UserID         string         `json:"user_id" gorm:"not null;index"`
	OrganizationID string         `json:"organization_id" gorm:"not null;index"`
	Role           string         `json:"role" gorm:"size:100;default:'inspector'"`
	Permissions    datatypes.JSON `json:"permissions" gorm:"type:jsonb;default:'{}'"`
	IsOrgAdmin     bool           `json:"is_org_admin" gorm:"default:false"`
	IsPrimary      bool           `json:"is_primary" gorm:"default:false"` // User's primary organization
	JoinedAt       time.Time      `json:"joined_at" gorm:"default:current_timestamp()"`
	InvitedBy      *string        `json:"invited_by"`
	Status         string         `json:"status" gorm:"size:50;default:'active'"` // active, pending, suspended, inactive
	LastAccessedAt *time.Time     `json:"last_accessed_at"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`

	// Relationships
	User         GlobalUser   `json:"user" gorm:"foreignKey:UserID"`
	Organization Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
	InvitedByUser *GlobalUser `json:"invited_by_user" gorm:"foreignKey:InvitedBy"`
}

// OrganizationInvitation represents an invitation to join an organization
type OrganizationInvitation struct {
	ID             string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	Email          string         `json:"email" gorm:"size:255;not null;index"`
	OrganizationID string         `json:"organization_id" gorm:"not null"`
	InvitedBy      string         `json:"invited_by" gorm:"not null"`
	Role           string         `json:"role" gorm:"size:100;default:'inspector'"`
	Permissions    datatypes.JSON `json:"permissions" gorm:"type:jsonb;default:'{}'"`
	Token          string         `json:"token" gorm:"size:255;unique;not null"`
	Message        string         `json:"message" gorm:"type:text"`
	ExpiresAt      time.Time      `json:"expires_at" gorm:"not null"`
	AcceptedAt     *time.Time     `json:"accepted_at"`
	AcceptedBy     *string        `json:"accepted_by"`
	RejectedAt     *time.Time     `json:"rejected_at"`
	CreatedAt      time.Time      `json:"created_at"`

	// Relationships
	Organization   Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
	InvitedByUser  GlobalUser   `json:"invited_by_user" gorm:"foreignKey:InvitedBy"`
	AcceptedByUser *GlobalUser  `json:"accepted_by_user" gorm:"foreignKey:AcceptedBy"`
}

// UserSession represents an active user session with organization context
type UserSession struct {
	ID                    string     `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	UserID                string     `json:"user_id" gorm:"not null;index"`
	CurrentOrganizationID *string    `json:"current_organization_id"`
	Token                 string     `json:"token" gorm:"size:500;unique;not null"`
	RefreshToken          string     `json:"refresh_token" gorm:"size:500;unique"`
	IPAddress             string     `json:"ip_address" gorm:"size:45"`
	UserAgent             string     `json:"user_agent" gorm:"type:text"`
	ExpiresAt             time.Time  `json:"expires_at" gorm:"not null"`
	LastActivityAt        *time.Time `json:"last_activity_at"`
	CreatedAt             time.Time  `json:"created_at"`

	// Relationships
	User                GlobalUser    `json:"user" gorm:"foreignKey:UserID"`
	CurrentOrganization *Organization `json:"current_organization" gorm:"foreignKey:CurrentOrganizationID"`
}

// UserOrganizationContext represents a user's accessible organizations
type UserOrganizationContext struct {
	UserID               string                   `json:"user_id"`
	CurrentOrganization  *Organization            `json:"current_organization"`
	Organizations        []OrganizationMemberInfo `json:"organizations"`
	PrimaryOrganization  *Organization            `json:"primary_organization"`
}

// OrganizationMemberInfo contains organization membership details for UI
type OrganizationMemberInfo struct {
	OrganizationID   string    `json:"organization_id"`
	OrganizationName string    `json:"organization_name"`
	OrganizationSlug string    `json:"organization_slug"`
	Role             string    `json:"role"`
	IsOrgAdmin       bool      `json:"is_org_admin"`
	IsPrimary        bool      `json:"is_primary"`
	JoinedAt         time.Time `json:"joined_at"`
	LastAccessedAt   *time.Time `json:"last_accessed_at"`
}

// TableName overrides for GORM
func (GlobalUser) TableName() string {
	return "global_users"
}

func (OrganizationMember) TableName() string {
	return "organization_members"
}

func (OrganizationInvitation) TableName() string {
	return "organization_invitations"
}

func (UserSession) TableName() string {
	return "user_sessions"
}