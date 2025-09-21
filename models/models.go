package models

import (
	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
	"time"
)

type Organization struct {
	ID           string         `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	Name         string         `json:"name" gorm:"size:255;not null"`
	Domain       string         `json:"domain" gorm:"size:100;unique;not null"`
	Slug         string         `json:"slug" gorm:"size:100;unique"` // URL-friendly identifier
	LogoURL      string         `json:"logo_url" gorm:"size:500"`
	PrimaryColor string         `json:"primary_color" gorm:"size:7"` // Hex color code
	Settings     datatypes.JSON `json:"settings" gorm:"type:jsonb;default:'{}'"`
	Plan         string         `json:"plan" gorm:"size:50;default:'free'"`
	IsActive     bool           `json:"is_active" gorm:"default:true"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// Relationships
	Members       []OrganizationMember `json:"members" gorm:"foreignKey:OrganizationID"`       // Multi-org support
	Templates     []Template           `json:"templates" gorm:"foreignKey:OrganizationID"`
	Sites         []Site               `json:"sites" gorm:"foreignKey:OrganizationID"`
	Inspections   []Inspection         `json:"inspections" gorm:"foreignKey:OrganizationID"`
	Notifications []Notification       `json:"notifications" gorm:"foreignKey:OrganizationID"`
}

// Legacy User model removed - replaced by GlobalUser in global_user.go

type Template struct {
	ID                 uuid.UUID      `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID     string         `json:"organization_id" gorm:"not null;index"`
	Name               string         `json:"name" gorm:"size:255;not null"`
	Description        string         `json:"description" gorm:"type:text"`
	Category           string         `json:"category" gorm:"size:100"`
	FieldsSchema       datatypes.JSON `json:"fields_schema" gorm:"type:jsonb;not null"`
	IsActive           bool           `json:"is_active" gorm:"default:true"`
	CreatedBy          string         `json:"created_by"` // References global_users.id (UUID)

	// Versioning fields
	Version            int            `json:"version" gorm:"default:1;index"`
	ParentTemplateID   *uuid.UUID     `json:"parent_template_id" gorm:"type:uuid;index"`
	IsLatestVersion    bool           `json:"is_latest_version" gorm:"default:true;index"`
	VersionNotes       string         `json:"version_notes" gorm:"type:text"`
	PublishedAt        time.Time      `json:"published_at" gorm:"default:now()"`

	CreatedAt          time.Time      `json:"created_at"`
	UpdatedAt          time.Time      `json:"updated_at"`
	DeletedAt          gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// Relationships
	Organization       Organization   `json:"organization" gorm:"foreignKey:OrganizationID"`
	// Note: Creator relationship will use GlobalUser after migration
	ParentTemplate     *Template      `json:"parent_template" gorm:"foreignKey:ParentTemplateID"`
	VersionedTemplates []Template     `json:"versioned_templates" gorm:"foreignKey:ParentTemplateID"`
	Inspections        []Inspection   `json:"inspections" gorm:"foreignKey:TemplateID"`
}

type Inspection struct {
	ID             uuid.UUID      `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID string         `json:"organization_id" gorm:"not null;index"`
	TemplateID     uuid.UUID      `json:"template_id" gorm:"type:uuid;not null"`
	TemplateVersion int           `json:"template_version" gorm:"not null;default:1"`
	InspectorID    string         `json:"inspector_id" gorm:"not null"` // References global_users.id (UUID)
	AssignedBy     *string        `json:"assigned_by"`
	AssignmentID   *string        `json:"assignment_id" gorm:"index"` // Reference to InspectionAssignment for workflow tracking
	SiteID         string         `json:"site_id" gorm:"type:uuid;not null;index"` // Required reference to Site
	Status         string         `json:"status" gorm:"size:50;default:'assigned'"`
	Priority       string         `json:"priority" gorm:"size:50;default:'medium'"`
	ScheduledFor   *time.Time     `json:"scheduled_for"`
	StartedAt      *time.Time     `json:"started_at"`
	CompletedAt    *time.Time     `json:"completed_at"`
	DueDate        *time.Time     `json:"due_date"`
	Notes          string         `json:"notes" gorm:"type:text"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// Relationships
	Organization   Organization     `json:"organization" gorm:"foreignKey:OrganizationID"`
	Template       Template         `json:"template" gorm:"foreignKey:TemplateID"`
	Inspector      GlobalUser       `json:"inspector" gorm:"foreignKey:InspectorID"`
	Site           Site             `json:"site" gorm:"foreignKey:SiteID"`
	InspectionData []InspectionData `json:"inspection_data" gorm:"foreignKey:InspectionID"`
	Attachments    []Attachment     `json:"attachments" gorm:"foreignKey:InspectionID"`
}

type InspectionData struct {
	ID           uuid.UUID `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	InspectionID uuid.UUID `json:"inspection_id" gorm:"type:uuid;not null"`
	FieldName    string    `json:"field_name" gorm:"size:255;not null"`
	FieldValue   string    `json:"field_value" gorm:"type:text"`
	FieldType    string    `json:"field_type" gorm:"size:100"`
	SectionName  string    `json:"section_name" gorm:"size:255"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`

	Inspection Inspection `json:"inspection" gorm:"foreignKey:InspectionID"`
}

type Attachment struct {
	ID             uuid.UUID `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID string    `json:"organization_id" gorm:"not null;index"`
	InspectionID   uuid.UUID `json:"inspection_id" gorm:"type:uuid;not null"`
	FileName       string    `json:"file_name" gorm:"size:255;not null"`
	FilePath       string    `json:"file_path" gorm:"size:500;not null"`
	FileType       string    `json:"file_type" gorm:"size:100"`
	FileSize       int64     `json:"file_size"`
	Description    string    `json:"description" gorm:"type:text"`
	FieldID        string    `json:"field_id" gorm:"size:255"`
	FieldName      string    `json:"field_name" gorm:"size:255"`
	StorageURL     string    `json:"storage_url" gorm:"size:1000"`
	UploadedAt     time.Time `json:"uploaded_at"`

	// Relationships
	Organization Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
	Inspection   Inspection   `json:"inspection" gorm:"foreignKey:InspectionID"`
}

type Notification struct {
	ID             uuid.UUID      `json:"id" gorm:"primarykey;type:uuid;default:gen_random_uuid()"`
	OrganizationID string         `json:"organization_id" gorm:"not null;index"`
	UserID         string         `json:"user_id" gorm:"not null"` // References global_users.id (UUID)
	InspectionID   *uuid.UUID     `json:"inspection_id" gorm:"type:uuid"`
	Title          string         `json:"title" gorm:"size:255;not null"`
	Message        string         `json:"message" gorm:"type:text;not null"`
	Type           string         `json:"type" gorm:"size:50;default:'info'"`
	IsRead         bool           `json:"is_read" gorm:"default:false"`
	CreatedAt      time.Time      `json:"created_at"`
	DeletedAt      gorm.DeletedAt `json:"deleted_at" gorm:"index"`

	// Relationships
	Organization Organization `json:"organization" gorm:"foreignKey:OrganizationID"`
	User         GlobalUser   `json:"user" gorm:"foreignKey:UserID"`
	Inspection   *Inspection  `json:"inspection" gorm:"foreignKey:InspectionID"`
}

// BeforeCreate hooks for UUID generation
func (t *Template) BeforeCreate(tx *gorm.DB) error {
	if t.ID == uuid.Nil {
		t.ID = uuid.New()
	}
	return nil
}

func (i *Inspection) BeforeCreate(tx *gorm.DB) error {
	if i.ID == uuid.Nil {
		i.ID = uuid.New()
	}
	return nil
}

func (d *InspectionData) BeforeCreate(tx *gorm.DB) error {
	if d.ID == uuid.Nil {
		d.ID = uuid.New()
	}
	return nil
}

func (a *Attachment) BeforeCreate(tx *gorm.DB) error {
	if a.ID == uuid.Nil {
		a.ID = uuid.New()
	}
	return nil
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == uuid.Nil {
		n.ID = uuid.New()
	}
	return nil
}