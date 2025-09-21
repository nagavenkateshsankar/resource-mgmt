package services

import (
	"errors"
	"fmt"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"time"

	"gorm.io/gorm"
)

type NotificationService struct {
	db *gorm.DB
}

func NewNotificationService() *NotificationService {
	return &NotificationService{
		db: config.DB,
	}
}

func (s *NotificationService) CreateNotification(req *models.CreateNotificationRequest) (*models.Notification, error) {
	notification := &models.Notification{
		OrganizationID: req.OrganizationID,
		UserID:         req.UserID,
		InspectionID:   req.InspectionID,
		Title:          req.Title,
		Message:        req.Message,
		Type:           req.Type,
		IsRead:         false,
		CreatedAt:      time.Now(),
	}

	err := s.db.Create(notification).Error
	if err != nil {
		return nil, err
	}

	// Load relationships
	err = s.db.
		Preload("Organization").
		Preload("User").
		Preload("Inspection").
		First(notification, notification.ID).Error

	if err != nil {
		return nil, err
	}

	return notification, nil
}

func (s *NotificationService) GetNotificationByID(id uint) (*models.Notification, error) {
	var notification models.Notification

	err := s.db.
		Preload("Organization").
		Preload("User").
		Preload("Inspection").
		First(&notification, id).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("notification not found")
		}
		return nil, err
	}

	return &notification, nil
}

func (s *NotificationService) GetUserNotifications(userID string, limit, offset int) ([]models.Notification, int64, error) {
	var notifications []models.Notification
	var total int64

	query := s.db.Model(&models.Notification{}).Where("user_id = ?", userID)

	err := query.Count(&total).Error
	if err != nil {
		return nil, 0, err
	}

	err = query.
		Preload("Organization").
		Preload("Inspection").
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&notifications).Error

	if err != nil {
		return nil, 0, err
	}

	return notifications, total, nil
}

func (s *NotificationService) GetUnreadNotifications(userID string) ([]models.Notification, error) {
	var notifications []models.Notification

	err := s.db.
		Where("user_id = ? AND is_read = ?", userID, false).
		Preload("Organization").
		Preload("Inspection").
		Order("created_at DESC").
		Find(&notifications).Error

	if err != nil {
		return nil, err
	}

	return notifications, nil
}

func (s *NotificationService) MarkAsRead(id uint) error {
	var notification models.Notification

	err := s.db.First(&notification, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("notification not found")
		}
		return err
	}

	notification.IsRead = true
	return s.db.Save(&notification).Error
}

func (s *NotificationService) MarkAllAsRead(userID string) error {
	return s.db.
		Model(&models.Notification{}).
		Where("user_id = ? AND is_read = ?", userID, false).
		Update("is_read", true).Error
}

func (s *NotificationService) DeleteNotification(id uint) error {
	var notification models.Notification

	err := s.db.First(&notification, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("notification not found")
		}
		return err
	}

	return s.db.Delete(&notification).Error
}

func (s *NotificationService) GetNotificationStats(userID string) (map[string]interface{}, error) {
	var stats struct {
		Total  int64 `json:"total"`
		Unread int64 `json:"unread"`
	}

	// Use raw SQL for better performance
	query := `
		SELECT
			COUNT(*) as total,
			COUNT(CASE WHEN is_read = false THEN 1 END) as unread
		FROM notifications
		WHERE user_id = ? AND deleted_at IS NULL
	`

	err := s.db.Raw(query, userID).Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	return map[string]interface{}{
		"total":  stats.Total,
		"unread": stats.Unread,
	}, nil
}

// Helper function to create inspection-related notifications
func (s *NotificationService) NotifyInspectionAssignment(inspection *models.Inspection, assignedBy string) error {
	// Get assigner details
	var assigner models.GlobalUser
	err := s.db.First(&assigner, "id = ?", assignedBy).Error
	if err != nil {
		return err
	}

	req := &models.CreateNotificationRequest{
		OrganizationID: inspection.OrganizationID,
		UserID:         inspection.InspectorID,
		InspectionID:   &inspection.ID,
		Title:          "New Inspection Assigned",
		Message:        fmt.Sprintf("You have been assigned a new inspection at %s by %s", inspection.Site.Name, assigner.Name),
		Type:           "assignment",
	}

	_, err = s.CreateNotification(req)
	return err
}

func (s *NotificationService) NotifyInspectionStatusChange(inspection *models.Inspection, oldStatus, newStatus string) error {
	// Determine who to notify based on the status change
	var notifyUserID string
	var title, message string

	switch newStatus {
	case "completed":
		// Notify the person who assigned it (if exists)
		if inspection.AssignedBy != nil {
			notifyUserID = *inspection.AssignedBy
			title = "Inspection Completed"
			message = fmt.Sprintf("Inspection at %s has been completed", inspection.Site.Name)
		}
	case "in_progress":
		// Optionally notify supervisor/admin
		title = "Inspection Started"
		message = fmt.Sprintf("Inspection at %s is now in progress", inspection.Site.Name)
	default:
		return nil
	}

	if notifyUserID != "" {
		req := &models.CreateNotificationRequest{
			OrganizationID: inspection.OrganizationID,
			UserID:         notifyUserID,
			InspectionID:   &inspection.ID,
			Title:          title,
			Message:        message,
			Type:           "status_change",
		}

		_, err := s.CreateNotification(req)
		return err
	}

	return nil
}

func (s *NotificationService) NotifyInspectionDueSoon(inspection *models.Inspection) error {
	if inspection.DueDate == nil {
		return nil
	}

	daysUntilDue := time.Until(*inspection.DueDate).Hours() / 24

	if daysUntilDue <= 1 && daysUntilDue > 0 {
		req := &models.CreateNotificationRequest{
			OrganizationID: inspection.OrganizationID,
			UserID:         inspection.InspectorID,
			InspectionID:   &inspection.ID,
			Title:          "Inspection Due Soon",
			Message:        fmt.Sprintf("Inspection at %s is due tomorrow", inspection.Site.Name),
			Type:           "reminder",
		}

		_, err := s.CreateNotification(req)
		return err
	}

	return nil
}

func (s *NotificationService) NotifyInspectionOverdue(inspection *models.Inspection) error {
	if inspection.DueDate == nil || inspection.Status == "completed" {
		return nil
	}

	if time.Now().After(*inspection.DueDate) {
		req := &models.CreateNotificationRequest{
			OrganizationID: inspection.OrganizationID,
			UserID:         inspection.InspectorID,
			InspectionID:   &inspection.ID,
			Title:          "Inspection Overdue",
			Message:        fmt.Sprintf("Inspection at %s is overdue", inspection.Site.Name),
			Type:           "alert",
		}

		_, err := s.CreateNotification(req)
		return err
	}

	return nil
}