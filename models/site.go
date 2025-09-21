package models

import (
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"time"
)

type Site struct {
	ID             string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID string         `json:"organization_id" gorm:"not null;index"`
	Name           string         `json:"name" gorm:"size:255;not null"`
	Address        string         `json:"address" gorm:"size:500;not null"`
	City           string         `json:"city" gorm:"size:100"`
	State          string         `json:"state" gorm:"size:100"`
	ZipCode        string         `json:"zip_code" gorm:"size:20"`
	Country        string         `json:"country" gorm:"size:100;default:'USA'"`
	Latitude       *float64       `json:"latitude"`
	Longitude      *float64       `json:"longitude"`
	Type           string         `json:"type" gorm:"size:50"` // office, warehouse, construction, facility, etc.
	Status         string         `json:"status" gorm:"size:50;default:'active'"` // active, inactive, maintenance
	ContactName    string         `json:"contact_name" gorm:"size:255"`
	ContactEmail   string         `json:"contact_email" gorm:"size:255"`
	ContactPhone   string         `json:"contact_phone" gorm:"size:50"`
	Metadata       datatypes.JSON `json:"metadata" gorm:"type:jsonb"` // Custom fields
	Notes          string         `json:"notes" gorm:"type:text"`
	CreatedBy      string         `json:"created_by"`
	UpdatedBy      string         `json:"updated_by"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// Relationships
	Organization Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
	Creator      GlobalUser   `json:"creator" gorm:"foreignKey:CreatedBy"`
	Updater      GlobalUser   `json:"updater" gorm:"foreignKey:UpdatedBy"`
	Inspections  []Inspection `json:"inspections" gorm:"foreignKey:SiteID"`
}

// SiteStats represents aggregated site statistics
type SiteStats struct {
	SiteID               string    `json:"site_id"`
	TotalInspections     int       `json:"total_inspections"`
	CompletedInspections int       `json:"completed_inspections"`
	PendingInspections   int       `json:"pending_inspections"`
	LastInspectionDate   time.Time `json:"last_inspection_date"`
	NextInspectionDate   time.Time `json:"next_inspection_date"`
	AverageScore         float64   `json:"average_score"`
	CriticalIssues       int       `json:"critical_issues"`
}

// TableName specifies the table name for Site model
func (Site) TableName() string {
	return "sites"
}

// BeforeCreate hook to generate UUID if not provided
func (s *Site) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		// Let PostgreSQL generate the UUID
		return nil
	}
	return nil
}

// GetFullAddress returns the complete formatted address
func (s *Site) GetFullAddress() string {
	address := s.Address
	if s.City != "" {
		address += ", " + s.City
	}
	if s.State != "" {
		address += ", " + s.State
	}
	if s.ZipCode != "" {
		address += " " + s.ZipCode
	}
	if s.Country != "" && s.Country != "USA" {
		address += ", " + s.Country
	}
	return address
}

// IsActive checks if the site is active
func (s *Site) IsActive() bool {
	return s.Status == "active"
}