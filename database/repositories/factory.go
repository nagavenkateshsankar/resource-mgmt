package repository

import (
	"resource-mgmt/pkg/database"
	"sync"

	"gorm.io/gorm"
)

// RepositoryManager manages all repositories with tenant isolation
type RepositoryManager struct {
	tenantDB *database.TenantDB

	// Repository instances
	templateRepo     TemplateRepository
	inspectionRepo   InspectionRepository
	attachmentRepo   AttachmentRepository
	notificationRepo NotificationRepository
	organizationRepo OrganizationRepository
	analyticsRepo    AnalyticsRepository

	// Synchronization
	once sync.Once
}

// NewRepositoryManager creates a new repository manager
func NewRepositoryManager(db *gorm.DB) *RepositoryManager {
	return &RepositoryManager{
		tenantDB: database.NewTenantDB(db),
	}
}


// Templates returns the template repository
func (rm *RepositoryManager) Templates() TemplateRepository {
	rm.once.Do(rm.initializeRepositories)
	return rm.templateRepo
}

// Inspections returns the inspection repository
func (rm *RepositoryManager) Inspections() InspectionRepository {
	rm.once.Do(rm.initializeRepositories)
	return rm.inspectionRepo
}

// Attachments returns the attachment repository
func (rm *RepositoryManager) Attachments() AttachmentRepository {
	rm.once.Do(rm.initializeRepositories)
	return rm.attachmentRepo
}

// Notifications returns the notification repository
func (rm *RepositoryManager) Notifications() NotificationRepository {
	rm.once.Do(rm.initializeRepositories)
	return rm.notificationRepo
}

// Organizations returns the organization repository
func (rm *RepositoryManager) Organizations() OrganizationRepository {
	rm.once.Do(rm.initializeRepositories)
	return rm.organizationRepo
}

// Analytics returns the analytics repository
func (rm *RepositoryManager) Analytics() AnalyticsRepository {
	rm.once.Do(rm.initializeRepositories)
	return rm.analyticsRepo
}

// TenantDB returns the tenant-aware database instance
func (rm *RepositoryManager) TenantDB() *database.TenantDB {
	return rm.tenantDB
}

// initializeRepositories initializes all repository instances
func (rm *RepositoryManager) initializeRepositories() {
	db := rm.tenantDB.DB

	// Initialize repositories
	rm.templateRepo = NewTemplateRepository(db)
	rm.inspectionRepo = NewInspectionRepository(db)
	rm.attachmentRepo = NewAttachmentRepository(db)
	rm.notificationRepo = NewNotificationRepository(db)
	rm.organizationRepo = NewOrganizationRepository(db)
	rm.analyticsRepo = NewAnalyticsRepository(db)
}

// Global repository manager instance
var globalRepoManager *RepositoryManager

// Initialize initializes the global repository manager
func Initialize(db *gorm.DB) {
	globalRepoManager = NewRepositoryManager(db)
}

// GetRepositoryManager returns the global repository manager
func GetRepositoryManager() *RepositoryManager {
	if globalRepoManager == nil {
		panic("repository manager not initialized. Call Initialize() first.")
	}
	return globalRepoManager
}

// Repository accessor functions for convenience

func Templates() TemplateRepository {
	return GetRepositoryManager().Templates()
}

func Inspections() InspectionRepository {
	return GetRepositoryManager().Inspections()
}

func Attachments() AttachmentRepository {
	return GetRepositoryManager().Attachments()
}

func Notifications() NotificationRepository {
	return GetRepositoryManager().Notifications()
}

func Organizations() OrganizationRepository {
	return GetRepositoryManager().Organizations()
}

func Analytics() AnalyticsRepository {
	return GetRepositoryManager().Analytics()
}