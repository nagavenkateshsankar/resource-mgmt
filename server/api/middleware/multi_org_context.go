package middleware

import (
	"net/http"
	"resource-mgmt/services"
	"strings"

	"github.com/gin-gonic/gin"
)

// MultiOrgContextMiddleware extracts organization context from URL or token
func MultiOrgContextMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Try to get organization from URL first
		orgSlug := extractOrgFromURL(c)

		// Get claims from JWT (should be set by auth middleware)
		claims, exists := c.Get("claims")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No authentication claims found"})
			c.Abort()
			return
		}

		multiOrgClaims, ok := claims.(*services.MultiOrgClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims format"})
			c.Abort()
			return
		}

		var currentOrgID string
		var currentOrgSlug string

		if orgSlug != "" {
			// URL-based context: Verify user has access to this org
			found := false
			for _, org := range multiOrgClaims.Organizations {
				if org.OrganizationSlug == orgSlug {
					currentOrgID = org.OrganizationID
					currentOrgSlug = org.OrganizationSlug
					found = true
					break
				}
			}

			if !found {
				c.JSON(http.StatusForbidden, gin.H{"error": "Access denied to this organization"})
				c.Abort()
				return
			}
		} else {
			// Token-based context: Use current organization from token
			currentOrgID = multiOrgClaims.CurrentOrganizationID

			// Find the slug for the current org
			for _, org := range multiOrgClaims.Organizations {
				if org.OrganizationID == currentOrgID {
					currentOrgSlug = org.OrganizationSlug
					break
				}
			}
		}

		// Set organization context for downstream handlers
		c.Set("organization_id", currentOrgID)
		c.Set("organization_slug", currentOrgSlug)
		c.Set("user_organizations", multiOrgClaims.Organizations)

		// For backward compatibility with existing code
		c.Set("userID", multiOrgClaims.UserID)
		c.Set("email", multiOrgClaims.Email)

		c.Next()
	}
}

// extractOrgFromURL extracts organization slug from URL patterns like /org/:slug/*
func extractOrgFromURL(c *gin.Context) string {
	// Check if URL contains /org/ pattern
	path := c.Request.URL.Path
	parts := strings.Split(path, "/")

	for i, part := range parts {
		if part == "org" && i+1 < len(parts) {
			return parts[i+1]
		}
	}

	// Also check for :org param (if using parameterized routes)
	if org := c.Param("org"); org != "" {
		return org
	}

	return ""
}

// RequireOrganizationContext ensures an organization context is present
func RequireOrganizationContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		orgID, exists := c.Get("organization_id")
		if !exists || orgID == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Organization context required"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// OrganizationSwitchHandler handles organization switching
func OrganizationSwitchHandler(authService *services.MultiOrgAuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("userID")

		var req struct {
			OrganizationID string `json:"organization_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		// Switch organization and get new token
		response, err := authService.SwitchOrganization(c.Request.Context(), userID.(string), req.OrganizationID)
		if err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, response)
	}
}

// GetOrganizationContext returns the current organization context
func GetOrganizationContext(c *gin.Context) (string, string, bool) {
	orgID, hasID := c.Get("organization_id")
	orgSlug, hasSlug := c.Get("organization_slug")

	if !hasID || !hasSlug {
		return "", "", false
	}

	return orgID.(string), orgSlug.(string), true
}