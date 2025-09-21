package repository

import (
	"context"
	"resource-mgmt/models"

	"gorm.io/gorm"
)

// NotificationRepositoryImpl implements NotificationRepository with tenant isolation
type NotificationRepositoryImpl struct {
	*BaseRepositoryImpl[models.Notification]
	db *gorm.DB
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *gorm.DB) NotificationRepository {
	return &NotificationRepositoryImpl{
		BaseRepositoryImpl: NewBaseRepository[models.Notification](db),
		db:                 db,
	}
}

// GetByUser retrieves notifications for a user within tenant scope
func (r *NotificationRepositoryImpl) GetByUser(ctx context.Context, userID string, limit, offset int) ([]models.Notification, int64, error) {
	filters := map[string]interface{}{
		"user_id": userID,
	}
	return r.GetAll(ctx, filters, limit, offset)
}

// GetUnread retrieves unread notifications for a user within tenant scope
func (r *NotificationRepositoryImpl) GetUnread(ctx context.Context, userID string) ([]models.Notification, error) {
	filters := map[string]interface{}{
		"user_id": userID,
		"is_read": false,
	}
	notifications, _, err := r.GetAll(ctx, filters, 100, 0) // Get all unread notifications
	return notifications, err
}

// MarkAsRead marks a notification as read within tenant scope
func (r *NotificationRepositoryImpl) MarkAsRead(ctx context.Context, notificationID uint) error {
	updates := map[string]interface{}{
		"is_read": true,
	}
	return r.Update(ctx, notificationID, updates)
}

// MarkAllAsRead marks all notifications as read for a user within tenant scope
func (r *NotificationRepositoryImpl) MarkAllAsRead(ctx context.Context, userID string) error {
	// TODO: Implement bulk update for all user notifications
	return nil
}