package services

import (
	"errors"
	"fmt"
	"resource-mgmt/models"

	"gorm.io/gorm"
)

type SiteService struct {
	db *gorm.DB
}

func NewSiteService(db *gorm.DB) *SiteService {
	return &SiteService{db: db}
}

// GetSites retrieves sites with filtering, search, and pagination
func (s *SiteService) GetSites(filters map[string]interface{}, search string, page, limit int) ([]models.Site, int64, error) {
	var sites []models.Site
	var total int64

	query := s.db.Model(&models.Site{})

	// Apply filters
	for key, value := range filters {
		query = query.Where(fmt.Sprintf("%s = ?", key), value)
	}

	// Apply search
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where(
			"name ILIKE ? OR address ILIKE ? OR city ILIKE ? OR contact_name ILIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	// Count total before pagination
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * limit
	if err := query.
		Order("name ASC").
		Offset(offset).
		Limit(limit).
		Find(&sites).Error; err != nil {
		return nil, 0, err
	}

	return sites, total, nil
}

// GetSite retrieves a single site by ID
func (s *SiteService) GetSite(siteID, organizationID string) (*models.Site, error) {
	var site models.Site
	if err := s.db.
		Where("id = ? AND organization_id = ?", siteID, organizationID).
		First(&site).Error; err != nil {
		return nil, err
	}
	return &site, nil
}

// CreateSite creates a new site
func (s *SiteService) CreateSite(site *models.Site) (*models.Site, error) {
	// Validate required fields
	if site.Name == "" || site.Address == "" {
		return nil, errors.New("name and address are required")
	}

	// Set default values
	if site.Status == "" {
		site.Status = "active"
	}
	if site.Country == "" {
		site.Country = "USA"
	}

	// Create site
	if err := s.db.Create(site).Error; err != nil {
		return nil, err
	}

	// Reload with relationships
	return s.GetSite(site.ID, site.OrganizationID)
}

// UpdateSite updates an existing site
func (s *SiteService) UpdateSite(siteID, organizationID string, updates map[string]interface{}) (*models.Site, error) {
	// Check if site exists
	var site models.Site
	if err := s.db.Where("id = ? AND organization_id = ?", siteID, organizationID).First(&site).Error; err != nil {
		return nil, err
	}

	// Update site
	if err := s.db.Model(&site).Updates(updates).Error; err != nil {
		return nil, err
	}

	// Return updated site
	return s.GetSite(siteID, organizationID)
}

// DeleteSite soft deletes a site
func (s *SiteService) DeleteSite(siteID, organizationID string) error {
	// Check if site has active inspections
	var inspectionCount int64
	if err := s.db.Model(&models.Inspection{}).
		Where("site_id = ? AND status IN ('draft', 'in_progress', 'requires_review')", siteID).
		Count(&inspectionCount).Error; err != nil {
		return err
	}

	if inspectionCount > 0 {
		return errors.New("cannot delete site with active inspections")
	}

	// Soft delete site
	return s.db.Where("id = ? AND organization_id = ?", siteID, organizationID).Delete(&models.Site{}).Error
}

// GetSiteStats retrieves statistics for a site
func (s *SiteService) GetSiteStats(siteID, organizationID string) (*models.SiteStats, error) {
	var stats models.SiteStats

	// Verify site exists
	var site models.Site
	if err := s.db.Where("id = ? AND organization_id = ?", siteID, organizationID).First(&site).Error; err != nil {
		return nil, err
	}

	stats.SiteID = siteID

	// Get inspection counts (using temporary int64 variables for Count)
	var totalCount, completedCount, pendingCount int64

	s.db.Model(&models.Inspection{}).
		Where("site_id = ?", siteID).
		Count(&totalCount)
	stats.TotalInspections = int(totalCount)

	s.db.Model(&models.Inspection{}).
		Where("site_id = ? AND status IN ('completed', 'approved')", siteID).
		Count(&completedCount)
	stats.CompletedInspections = int(completedCount)

	s.db.Model(&models.Inspection{}).
		Where("site_id = ? AND status IN ('draft', 'in_progress', 'requires_review')", siteID).
		Count(&pendingCount)
	stats.PendingInspections = int(pendingCount)

	// Get last inspection date
	s.db.Model(&models.Inspection{}).
		Where("site_id = ? AND completed_at IS NOT NULL", siteID).
		Order("completed_at DESC").
		Limit(1).
		Pluck("completed_at", &stats.LastInspectionDate)

	// Get next scheduled inspection
	s.db.Model(&models.Inspection{}).
		Where("site_id = ? AND scheduled_for > NOW()", siteID).
		Order("scheduled_for ASC").
		Limit(1).
		Pluck("scheduled_for", &stats.NextInspectionDate)

	// Count critical issues (would need inspection_data analysis)
	// This is a simplified version - in reality, you'd analyze inspection_data
	var criticalCount int64
	s.db.Model(&models.Inspection{}).
		Where("site_id = ? AND notes ILIKE '%critical%'", siteID).
		Count(&criticalCount)
	stats.CriticalIssues = int(criticalCount)

	return &stats, nil
}

// GetSiteInspections retrieves inspections for a site
func (s *SiteService) GetSiteInspections(siteID, organizationID string, page, limit int) ([]models.Inspection, int64, error) {
	var inspections []models.Inspection
	var total int64

	// Verify site exists
	var site models.Site
	if err := s.db.Where("id = ? AND organization_id = ?", siteID, organizationID).First(&site).Error; err != nil {
		return nil, 0, err
	}

	query := s.db.Model(&models.Inspection{}).Where("site_id = ?", siteID)

	// Count total
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get inspections with pagination
	offset := (page - 1) * limit
	if err := query.
		Preload("Template").
		Order("created_at DESC").
		Offset(offset).
		Limit(limit).
		Find(&inspections).Error; err != nil {
		return nil, 0, err
	}

	return inspections, total, nil
}

// GetActiveSites retrieves all active sites for dropdown use
func (s *SiteService) GetActiveSites(organizationID string) ([]models.Site, error) {
	var sites []models.Site
	if err := s.db.
		Where("organization_id = ? AND status = 'active'", organizationID).
		Order("name ASC").
		Find(&sites).Error; err != nil {
		return nil, err
	}
	return sites, nil
}

// GetRecentSites retrieves recently used sites for a user
func (s *SiteService) GetRecentSites(organizationID string, limit int) ([]models.Site, error) {
	var siteIDs []string

	// Get site IDs from recent inspections
	if err := s.db.Model(&models.Inspection{}).
		Where("organization_id = ? AND site_id IS NOT NULL", organizationID).
		Order("created_at DESC").
		Limit(limit * 2). // Get more to account for duplicates
		Distinct("site_id").
		Pluck("site_id", &siteIDs).Error; err != nil {
		return nil, err
	}

	if len(siteIDs) == 0 {
		return []models.Site{}, nil
	}

	// Get the actual sites
	var sites []models.Site
	if err := s.db.
		Where("id IN ? AND status = 'active'", siteIDs).
		Order("name ASC").
		Limit(limit).
		Find(&sites).Error; err != nil {
		return nil, err
	}

	return sites, nil
}