package middleware

import (
	"context"
	"net/http"
	"resource-mgmt/pkg/tenant"

	"github.com/gin-gonic/gin"
)

// TenantContextMiddleware extracts tenant information from JWT and sets it in context
func TenantContextMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip tenant context for public endpoints
		if isPublicTenantEndpoint(c.Request.URL.Path) {
			c.Next()
			return
		}

		// Extract tenant information from JWT token (set by AuthMiddleware)
		organizationID, exists := c.Get("organization_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Organization context not found",
				"code":  "MISSING_TENANT_CONTEXT",
			})
			c.Abort()
			return
		}

		userID, exists := c.Get("user_id")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User context not found",
				"code":  "MISSING_USER_CONTEXT",
			})
			c.Abort()
			return
		}

		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User role not found",
				"code":  "MISSING_ROLE_CONTEXT",
			})
			c.Abort()
			return
		}

		// Validate context values
		orgIDStr, ok := organizationID.(string)
		if !ok || orgIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid organization context",
				"code":  "INVALID_TENANT_CONTEXT",
			})
			c.Abort()
			return
		}

		userIDStr, ok := userID.(string)
		if !ok || userIDStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid user context",
				"code":  "INVALID_USER_CONTEXT",
			})
			c.Abort()
			return
		}

		userRoleStr, ok := userRole.(string)
		if !ok || userRoleStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid role context",
				"code":  "INVALID_ROLE_CONTEXT",
			})
			c.Abort()
			return
		}

		// Create tenant context
		tenantCtx := tenant.NewContext(orgIDStr, userIDStr, userRoleStr)

		// Validate tenant context
		if err := tenantCtx.Validate(); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid tenant context: " + err.Error(),
				"code":  "TENANT_VALIDATION_FAILED",
			})
			c.Abort()
			return
		}

		// Add tenant context to request context
		ctx := tenant.WithTenantContext(c.Request.Context(), tenantCtx)
		c.Request = c.Request.WithContext(ctx)

		// Log tenant context for debugging (in development only)
		logTenantContext(c, tenantCtx)

		c.Next()
	}
}

// RequireAdminContext middleware ensures the user has admin privileges
func RequireAdminContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantCtx, err := tenant.FromContext(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Tenant context required",
				"code":  "MISSING_TENANT_CONTEXT",
			})
			c.Abort()
			return
		}

		if !tenantCtx.IsAdmin() {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Admin privileges required",
				"code":  "INSUFFICIENT_PRIVILEGES",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireSupervisorOrAdminContext middleware ensures the user has supervisor or admin privileges
func RequireSupervisorOrAdminContext() gin.HandlerFunc {
	return func(c *gin.Context) {
		tenantCtx, err := tenant.FromContext(c.Request.Context())
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Tenant context required",
				"code":  "MISSING_TENANT_CONTEXT",
			})
			c.Abort()
			return
		}

		if !tenantCtx.CanAccessAllData() {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Supervisor or admin privileges required",
				"code":  "INSUFFICIENT_PRIVILEGES",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// GetTenantContext extracts tenant context from Gin context
func GetTenantContext(c *gin.Context) (*tenant.Context, error) {
	return tenant.FromContext(c.Request.Context())
}

// GetTenantContextFromRequest extracts tenant context from request context
func GetTenantContextFromRequest(ctx context.Context) (*tenant.Context, error) {
	return tenant.FromContext(ctx)
}

// isPublicTenantEndpoint checks if the endpoint doesn't require tenant context
func isPublicTenantEndpoint(path string) bool {
	publicPaths := []string{
		"/api/v1/health",
		"/api/v1/auth/login",
		"/api/v1/auth/register",
		"/api/v1/auth/google/login",
		"/api/v1/auth/google/callback",
		"/api/v1/auth/microsoft/login",
		"/api/v1/auth/microsoft/callback",
		"/api/v1/organizations",                // Public for organization creation
		"/api/v1/organizations/check-domain",  // Public for domain validation
	}

	for _, publicPath := range publicPaths {
		if path == publicPath {
			return true
		}
	}

	return false
}

// logTenantContext logs tenant context for debugging
func logTenantContext(c *gin.Context, tenantCtx *tenant.Context) {
	// Only log in development mode
	if gin.Mode() == gin.DebugMode {
		c.Header("X-Debug-Organization-ID", tenantCtx.OrganizationID)
		c.Header("X-Debug-User-ID", tenantCtx.UserID)
		c.Header("X-Debug-User-Role", tenantCtx.UserRole)
	}
}