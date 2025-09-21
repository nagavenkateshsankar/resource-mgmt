package repository

import (
	"resource-mgmt/models"

	"gorm.io/gorm"
)

// OrganizationRepositoryImpl implements OrganizationRepository
type OrganizationRepositoryImpl struct {
	db *gorm.DB
}

// NewOrganizationRepository creates a new organization repository
func NewOrganizationRepository(db *gorm.DB) OrganizationRepository {
	return &OrganizationRepositoryImpl{
		db: db,
	}
}

// Create creates a new organization
func (r *OrganizationRepositoryImpl) Create(org *models.Organization) error {
	return r.db.Create(org).Error
}

// GetByID retrieves an organization by ID
func (r *OrganizationRepositoryImpl) GetByID(id string) (*models.Organization, error) {
	var org models.Organization
	err := r.db.First(&org, "id = ?", id).Error
	return &org, err
}

// GetByDomain retrieves an organization by domain
func (r *OrganizationRepositoryImpl) GetByDomain(domain string) (*models.Organization, error) {
	var org models.Organization
	err := r.db.Where("domain = ?", domain).First(&org).Error
	return &org, err
}

// Update updates an organization
func (r *OrganizationRepositoryImpl) Update(id string, updates map[string]interface{}) error {
	return r.db.Model(&models.Organization{}).Where("id = ?", id).Updates(updates).Error
}

// GetAll retrieves all organizations (system admin only)
func (r *OrganizationRepositoryImpl) GetAll(limit, offset int) ([]models.Organization, int64, error) {
	var orgs []models.Organization
	var total int64

	err := r.db.Model(&models.Organization{}).Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = r.db.Limit(limit).Offset(offset).Find(&orgs).Error
	return orgs, total, err
}