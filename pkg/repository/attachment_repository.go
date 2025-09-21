package repository

import (
	"context"
	"resource-mgmt/models"

	"gorm.io/gorm"
)

// AttachmentRepositoryImpl implements AttachmentRepository with tenant isolation
type AttachmentRepositoryImpl struct {
	*BaseRepositoryImpl[models.Attachment]
	db *gorm.DB
}

// NewAttachmentRepository creates a new attachment repository
func NewAttachmentRepository(db *gorm.DB) AttachmentRepository {
	return &AttachmentRepositoryImpl{
		BaseRepositoryImpl: NewBaseRepository[models.Attachment](db),
		db:                 db,
	}
}

// GetByInspection retrieves attachments by inspection within tenant scope
func (r *AttachmentRepositoryImpl) GetByInspection(ctx context.Context, inspectionID uint) ([]models.Attachment, error) {
	filters := map[string]interface{}{
		"inspection_id": inspectionID,
	}
	attachments, _, err := r.GetAll(ctx, filters, 100, 0) // Get all attachments for the inspection
	return attachments, err
}

// GetByType retrieves attachments by type within tenant scope
func (r *AttachmentRepositoryImpl) GetByType(ctx context.Context, fileType string, limit, offset int) ([]models.Attachment, int64, error) {
	filters := map[string]interface{}{
		"file_type": fileType,
	}
	return r.GetAll(ctx, filters, limit, offset)
}

// UpdateMetadata updates attachment metadata within tenant scope
func (r *AttachmentRepositoryImpl) UpdateMetadata(ctx context.Context, attachmentID uint, metadata map[string]interface{}) error {
	return r.Update(ctx, attachmentID, metadata)
}