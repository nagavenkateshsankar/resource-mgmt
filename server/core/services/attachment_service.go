package services

import (
	"errors"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"time"

	"gorm.io/gorm"
)

type AttachmentService struct {
	db *gorm.DB
}

func NewAttachmentService() *AttachmentService {
	return &AttachmentService{
		db: config.DB,
	}
}

func (s *AttachmentService) CreateAttachment(req *models.CreateAttachmentRequest) (*models.Attachment, error) {
	// Get organization ID from inspection
	var inspection models.Inspection
	err := s.db.First(&inspection, req.InspectionID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("inspection not found")
		}
		return nil, err
	}

	attachment := &models.Attachment{
		OrganizationID: inspection.OrganizationID,
		InspectionID:   req.InspectionID,
		FileName:       req.FileName,
		FilePath:       req.FilePath,
		FileType:       req.FileType,
		FileSize:       req.FileSize,
		Description:    req.Description,
		UploadedAt:     time.Now(),
	}

	err = s.db.Create(attachment).Error
	if err != nil {
		return nil, err
	}

	// Load relationships
	err = s.db.
		Preload("Organization").
		Preload("Inspection").
		First(attachment, attachment.ID).Error

	if err != nil {
		return nil, err
	}

	return attachment, nil
}

func (s *AttachmentService) GetAttachmentByID(id uint) (*models.Attachment, error) {
	var attachment models.Attachment

	err := s.db.
		Preload("Organization").
		Preload("Inspection").
		First(&attachment, id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("attachment not found")
		}
		return nil, err
	}

	return &attachment, nil
}

func (s *AttachmentService) GetAttachmentsByInspection(inspectionID uint) ([]models.Attachment, error) {
	var attachments []models.Attachment

	err := s.db.
		Where("inspection_id = ?", inspectionID).
		Preload("Organization").
		Preload("Inspection").
		Order("uploaded_at DESC").
		Find(&attachments).Error

	if err != nil {
		return nil, err
	}

	return attachments, nil
}

func (s *AttachmentService) DeleteAttachment(id uint) error {
	var attachment models.Attachment

	err := s.db.First(&attachment, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("attachment not found")
		}
		return err
	}

	return s.db.Delete(&attachment).Error
}

func (s *AttachmentService) GetAttachmentsByOrganization(organizationID string, limit, offset int) ([]models.Attachment, int64, error) {
	var attachments []models.Attachment
	var total int64

	query := s.db.Model(&models.Attachment{}).Where("organization_id = ?", organizationID)

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.
		Preload("Inspection").
		Order("uploaded_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&attachments).Error

	if err != nil {
		return nil, 0, err
	}

	return attachments, total, nil
}

func (s *AttachmentService) GetAttachmentStats() (map[string]interface{}, error) {
	var stats struct {
		Total    int64 `json:"total"`
		TotalMB  int64 `json:"total_mb"`
		Images   int64 `json:"images"`
		PDFs     int64 `json:"pdfs"`
		Documents int64 `json:"documents"`
		Other    int64 `json:"other"`
	}

	// Use raw SQL for better performance
	query := `
		SELECT
			COUNT(*) as total,
			COALESCE(SUM(file_size), 0) / 1024 / 1024 as total_mb,
			COUNT(CASE WHEN file_type LIKE 'image%' THEN 1 END) as images,
			COUNT(CASE WHEN file_type = 'application/pdf' THEN 1 END) as pdfs,
			COUNT(CASE WHEN file_type LIKE 'application%' AND file_type != 'application/pdf' THEN 1 END) as documents,
			COUNT(CASE WHEN file_type NOT LIKE 'image%' AND file_type != 'application/pdf' AND file_type NOT LIKE 'application%' THEN 1 END) as other
		FROM attachments
	`

	err := s.db.Raw(query).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total":     stats.Total,
		"total_mb":  stats.TotalMB,
		"images":    stats.Images,
		"pdfs":      stats.PDFs,
		"documents": stats.Documents,
		"other":     stats.Other,
	}, nil
}