package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// TenantContext middleware ensures all database operations are scoped to the user's organization
func TenantContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get organization ID from context (set by AuthMiddleware)
		organizationID, exists := c.Get("organization_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
			c.Abort()
			return
		}

		// Ensure organization ID is a string
		orgID, ok := organizationID.(string)
		if !ok || orgID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid organization context"})
			c.Abort()
			return
		}

		// Store organization ID in a standardized context key for services to use
		c.Set("tenant_id", orgID)
		c.Next()
	}
}

// RequireOrganization middleware that can be used on specific routes that need tenant isolation
func RequireOrganization() gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, exists := c.Get("organization_id")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Organization access required"})
			c.Abort()
			return
		}

		if orgID == "" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid organization"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetOrganizationID is a helper function to extract organization ID from Gin context
func GetOrganizationID(c *gin.Context) string {
	if orgID, exists := c.Get("organization_id"); exists {
		if id, ok := orgID.(string); ok {
			return id
		}
	}
	return ""
}

// GetTenantID is a helper function to extract tenant ID from Gin context
func GetTenantID(c *gin.Context) string {
	if tenantID, exists := c.Get("tenant_id"); exists {
		if id, ok := tenantID.(string); ok {
			return id
		}
	}
	return ""
}