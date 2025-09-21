package repository

import (
	"context"
	"resource-mgmt/models"

	"github.com/google/uuid"
)

// BaseRepository defines common repository operations with tenant isolation
type BaseRepository[T any] interface {
	// Create creates a new entity with automatic tenant context
	Create(ctx context.Context, entity *T) error

	// GetByID retrieves an entity by ID within tenant scope
	GetByID(ctx context.Context, id uint) (*T, error)

	// GetByUUID retrieves an entity by UUID within tenant scope
	GetByUUID(ctx context.Context, id uuid.UUID) (*T, error)

	// GetAll retrieves all entities within tenant scope with pagination
	GetAll(ctx context.Context, filters map[string]interface{}, limit, offset int) ([]T, int64, error)

	// Update updates an entity within tenant scope
	Update(ctx context.Context, id uint, updates map[string]interface{}) error

	// UpdateByUUID updates an entity by UUID within tenant scope
	UpdateByUUID(ctx context.Context, id uuid.UUID, updates map[string]interface{}) error

	// Delete soft deletes an entity within tenant scope
	Delete(ctx context.Context, id uint) error

	// DeleteByUUID soft deletes an entity by UUID within tenant scope
	DeleteByUUID(ctx context.Context, id uuid.UUID) error

	// Count returns the count of entities within tenant scope
	Count(ctx context.Context, filters map[string]interface{}) (int64, error)

	// Exists checks if an entity exists within tenant scope
	Exists(ctx context.Context, id uint) (bool, error)

	// ExistsByUUID checks if an entity exists by UUID within tenant scope
	ExistsByUUID(ctx context.Context, id uuid.UUID) (bool, error)
}

// GlobalUserRepository defines global user-specific repository operations
// Note: GlobalUser model uses string IDs and manages multi-org membership
type GlobalUserRepository interface {
	Create(entity *models.GlobalUser) error
	GetByID(id string) (*models.GlobalUser, error)
	GetByEmail(email string) (*models.GlobalUser, error)
	Update(id string, updates map[string]interface{}) error
	Delete(id string) error
	UpdatePassword(userID string, hashedPassword string) error
}

// TemplateRepository defines template-specific repository operations
type TemplateRepository interface {
	BaseRepository[models.Template]
	GetByCategory(ctx context.Context, category string, limit, offset int) ([]models.Template, int64, error)
	GetActiveTemplates(ctx context.Context, limit, offset int) ([]models.Template, int64, error)
	GetCategories(ctx context.Context) ([]string, error)
	Duplicate(ctx context.Context, templateID uint, newName string) (*models.Template, error)
	DuplicateByUUID(ctx context.Context, templateID uuid.UUID, newName string) (*models.Template, error)
	GetByVersionUUID(ctx context.Context, templateID uuid.UUID, version int, organizationID string) (*models.Template, error)
	GetLatestVersionUUID(ctx context.Context, templateID uuid.UUID, organizationID string) (*models.Template, error)
}

// InspectionRepository defines inspection-specific repository operations
type InspectionRepository interface {
	BaseRepository[models.Inspection]
	GetByInspector(ctx context.Context, inspectorID string, limit, offset int) ([]models.Inspection, int64, error)
	GetByStatus(ctx context.Context, status string, limit, offset int) ([]models.Inspection, int64, error)
	GetByTemplate(ctx context.Context, templateID uint, limit, offset int) ([]models.Inspection, int64, error)
	GetOverdue(ctx context.Context, limit, offset int) ([]models.Inspection, int64, error)
	GetDueToday(ctx context.Context) ([]models.Inspection, error)
	UpdateStatus(ctx context.Context, inspectionID uuid.UUID, status string) error
	Submit(ctx context.Context, inspectionID uuid.UUID, formData map[string]interface{}) error
	GetInspectionStats(ctx context.Context) (map[string]interface{}, error)
}

// AttachmentRepository defines attachment-specific repository operations
type AttachmentRepository interface {
	BaseRepository[models.Attachment]
	GetByInspection(ctx context.Context, inspectionID uint) ([]models.Attachment, error)
	GetByType(ctx context.Context, fileType string, limit, offset int) ([]models.Attachment, int64, error)
	UpdateMetadata(ctx context.Context, attachmentID uint, metadata map[string]interface{}) error
}

// NotificationRepository defines notification-specific repository operations
type NotificationRepository interface {
	BaseRepository[models.Notification]
	GetByUser(ctx context.Context, userID string, limit, offset int) ([]models.Notification, int64, error)
	GetUnread(ctx context.Context, userID string) ([]models.Notification, error)
	MarkAsRead(ctx context.Context, notificationID uint) error
	MarkAllAsRead(ctx context.Context, userID string) error
}

// OrganizationRepository defines organization-specific repository operations
type OrganizationRepository interface {
	// Note: Organization operations don't use tenant context as they manage tenants
	Create(entity *models.Organization) error
	GetByID(id string) (*models.Organization, error)
	GetByDomain(domain string) (*models.Organization, error)
	Update(id string, updates map[string]interface{}) error
	GetAll(limit, offset int) ([]models.Organization, int64, error)
}

// AnalyticsRepository defines analytics-specific repository operations
type AnalyticsRepository interface {
	GetDashboardStats(ctx context.Context) (map[string]interface{}, error)
}