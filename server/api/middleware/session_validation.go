package middleware

import (
	"net/http"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SessionValidationMiddleware validates that the JWT token corresponds to an active session
func SessionValidationMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip session validation for public endpoints
		if isPublicEndpoint(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Extract token from Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Authorization header required",
				"code":  "MISSING_AUTH_HEADER",
			})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Bearer token required",
				"code":  "INVALID_AUTH_FORMAT",
			})
			c.Abort()
			return
		}

		// Check if session exists and is valid
		var session models.UserSession
		err := config.DB.Where("token = ? AND expires_at > ?", tokenString, time.Now()).
			Preload("User").
			Preload("CurrentOrganization").
			First(&session).Error

		if err != nil {
			if err == gorm.ErrRecordNotFound {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Invalid or expired session",
					"code":  "INVALID_SESSION",
				})
			} else {
				c.JSON(http.StatusInternalServerError, gin.H{
					"error": "Session validation failed",
					"code":  "SESSION_VALIDATION_ERROR",
				})
			}
			c.Abort()
			return
		}

		// Check for session replay attacks by validating last activity
		if session.LastActivityAt != nil {
			timeSinceLastActivity := time.Since(*session.LastActivityAt)
			// If more than 30 minutes since last activity, require fresh authentication
			if timeSinceLastActivity > 30*time.Minute {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": "Session expired due to inactivity",
					"code":  "SESSION_EXPIRED",
				})
				c.Abort()
				return
			}
		}

		// Update last activity timestamp
		now := time.Now()
		config.DB.Model(&session).Update("last_activity_at", &now)

		// Set user and organization context for downstream middleware
		c.Set("session_id", session.ID)
		c.Set("user_id", session.UserID)
		c.Set("user", session.User)
		if session.CurrentOrganizationID != nil {
			c.Set("organization_id", *session.CurrentOrganizationID)
			if session.CurrentOrganization != nil {
				c.Set("organization", *session.CurrentOrganization)
			}
		}

		// Set additional metadata
		c.Set("session_ip", session.IPAddress)
		c.Set("session_user_agent", session.UserAgent)

		c.Next()
	}
}

// InvalidateSessionMiddleware provides a way to invalidate the current session
func InvalidateSessionMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		sessionID, exists := c.Get("session_id")
		if exists {
			// Delete the session from database
			config.DB.Delete(&models.UserSession{}, sessionID)
		}

		c.JSON(http.StatusOK, gin.H{
			"message": "Session invalidated successfully",
		})
	}
}

// CleanupExpiredSessionsJob should be run periodically to clean up expired sessions
func CleanupExpiredSessionsJob() error {
	result := config.DB.Where("expires_at < ?", time.Now()).Delete(&models.UserSession{})
	return result.Error
}

// GetActiveSessionsForUser returns count of active sessions for a user
func GetActiveSessionsForUser(userID string) (int64, error) {
	var count int64
	err := config.DB.Model(&models.UserSession{}).
		Where("user_id = ? AND expires_at > ?", userID, time.Now()).
		Count(&count).Error
	return count, err
}

// InvalidateAllUserSessions invalidates all sessions for a specific user
func InvalidateAllUserSessions(userID string) error {
	return config.DB.Where("user_id = ?", userID).Delete(&models.UserSession{}).Error
}

// isPublicEndpoint checks if the endpoint doesn't require session validation
func isPublicEndpoint(path string) bool {
	publicPaths := []string{
		"/api/v1/health",
		"/api/v1/auth/login",
		"/api/v1/auth/register",
		"/api/v1/auth/google/login",
		"/api/v1/auth/google/callback",
		"/api/v1/auth/microsoft/login",
		"/api/v1/auth/microsoft/callback",
		"/api/v1/organizations/check-domain",
	}

	for _, publicPath := range publicPaths {
		if path == publicPath {
			return true
		}
	}

	return false
}