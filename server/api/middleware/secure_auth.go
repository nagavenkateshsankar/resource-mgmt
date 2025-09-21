package middleware

import (
	"net/http"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"resource-mgmt/pkg/tenant"
	"resource-mgmt/pkg/utils"
	"resource-mgmt/services"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// SecureAuthMiddleware provides consolidated authentication using MultiOrgClaims
func SecureAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Skip authentication for public endpoints
		if isSecurePublicEndpoint(c.Request.URL.Path) {
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

		// Validate JWT token with secure secret
		claims, err := validateSecureJWTToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid token",
				"code":  "INVALID_TOKEN",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		// TODO: Session validation temporarily disabled due to integer vs UUID user ID mismatch
		// The user_sessions table expects UUID format but we have integer user IDs
		// This will be re-enabled after migrating to proper UUID format

		// Validate session exists and is active
		// if err := validateActiveSession(tokenString, claims.UserID); err != nil {
		// 	c.JSON(http.StatusUnauthorized, gin.H{
		// 		"error": "Session validation failed",
		// 		"code":  "SESSION_INVALID",
		// 		"details": err.Error(),
		// 	})
		// 	c.Abort()
		// 	return
		// }

		// TODO: Organization access validation temporarily disabled due to integer vs UUID user ID mismatch
		// The organization_members table expects UUID format but we have integer user IDs
		// This will be re-enabled after migrating to proper UUID format

		// Validate organization access with database check
		// if claims.CurrentOrganizationID != "" {
		// 	if err := validateOrganizationAccess(claims.UserID, claims.CurrentOrganizationID); err != nil {
		// 		c.JSON(http.StatusForbidden, gin.H{
		// 			"error": "Organization access denied",
		// 			"code":  "ORG_ACCESS_DENIED",
		// 			"details": err.Error(),
		// 		})
		// 		c.Abort()
		// 		return
		// 	}
		// }

		// Set standardized context for downstream handlers
		c.Set("claims", claims)
		c.Set("user_id", claims.UserID)
		c.Set("user_email", claims.Email)
		c.Set("user_name", claims.Name)
		c.Set("user_organizations", claims.Organizations)

		// Set role and permissions from current organization
		currentRole, currentPermissions := getCurrentOrgRoleAndPermissions(claims)
		c.Set("user_role", currentRole)
		c.Set("user_permissions", currentPermissions)

		// COMPATIBILITY FIX: Set organization_id for old authentication system
		orgID := claims.CurrentOrganizationID
		if orgID == "" && len(claims.Organizations) == 0 && claims.UserID != "" {
			// For old token compatibility, try to get organization from user's memberships
			var membership models.OrganizationMember
			err := config.DB.Where("user_id = ? AND status = ?", claims.UserID, "active").First(&membership).Error
			if err == nil {
				orgID = membership.OrganizationID
			}
		}
		c.Set("organization_id", orgID)

		// IMPORTANT: Also set tenant context in the request context for repository layer
		if orgID != "" && claims.UserID != "" && currentRole != "" {
			tenantCtx := tenant.NewContext(orgID, claims.UserID, currentRole)
			c.Request = c.Request.WithContext(tenant.WithTenantContext(c.Request.Context(), tenantCtx))
		}

		// Update session activity
		updateSessionActivity(tokenString)

		c.Next()
	}
}

// validateSecureJWTToken validates JWT token using secure secret management
func validateSecureJWTToken(tokenString string) (*services.MultiOrgClaims, error) {
	// Get secure JWT secret
	secretBytes, err := utils.GetJWTSecret()
	if err != nil {
		return nil, err
	}

	// Parse and validate token
	token, err := jwt.ParseWithClaims(tokenString, &services.MultiOrgClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return secretBytes, nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*services.MultiOrgClaims); ok && token.Valid {
		// Additional claims validation
		if claims.UserID == "" || claims.Email == "" {
			return nil, jwt.ErrInvalidKey
		}
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

// validateActiveSession ensures the session exists and is active
func validateActiveSession(tokenString, userID string) error {
	var session models.UserSession
	err := config.DB.Where("token = ? AND user_id = ? AND expires_at > ?",
		tokenString, userID, time.Now()).First(&session).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return gorm.ErrRecordNotFound
		}
		return err
	}

	return nil
}

// validateOrganizationAccess validates user has active access to organization
func validateOrganizationAccess(userID, organizationID string) error {
	var membership models.OrganizationMember
	err := config.DB.Where("user_id = ? AND organization_id = ? AND status = ?",
		userID, organizationID, "active").First(&membership).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return gorm.ErrRecordNotFound
		}
		return err
	}

	return nil
}

// getCurrentOrgRoleAndPermissions extracts role and permissions for current organization
func getCurrentOrgRoleAndPermissions(claims *services.MultiOrgClaims) (string, map[string]interface{}) {
	// Find current organization in the claims
	for _, org := range claims.Organizations {
		if org.OrganizationID == claims.CurrentOrganizationID {
			// Get default permissions for role (can be extended to fetch from database)
			permissions := getPermissionsForRole(org.Role)
			return org.Role, permissions
		}
	}

	// COMPATIBILITY FIX: Handle old authentication system where Organizations might be empty
	// In this case, we need to check if this is an old token by looking up the user's membership
	if len(claims.Organizations) == 0 && claims.UserID != "" {
		// Query the database to get the user's role from organization membership
		var membership models.OrganizationMember
		err := config.DB.Where("user_id = ? AND status = ? AND is_primary = ?", claims.UserID, "active", true).First(&membership).Error
		if err == nil {
			// Use the membership role and generate permissions accordingly
			permissions := getPermissionsForRole(membership.Role)
			return membership.Role, permissions
		}
	}

	// Fallback to viewer role if no organization context
	return "viewer", getPermissionsForRole("viewer")
}

// getPermissionsForRole returns permissions map for a given role
func getPermissionsForRole(role string) map[string]interface{} {
	switch role {
	case "admin":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_all_inspections": true,
			"can_edit_inspections":     true,
			"can_delete_inspections":   true,
			"can_manage_templates":     true,
			"can_manage_users":         true,
			"can_view_reports":         true,
			"can_export_reports":       true,
			"can_manage_organization":  true,
		}
	case "supervisor":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_all_inspections": true,
			"can_edit_inspections":     true,
			"can_delete_inspections":   false,
			"can_manage_templates":     true,
			"can_manage_users":         false,
			"can_view_reports":         true,
			"can_export_reports":       true,
			"can_manage_organization":  false,
		}
	case "inspector":
		return map[string]interface{}{
			"can_create_inspections":   true,
			"can_view_all_inspections": false,
			"can_edit_inspections":     true,
			"can_delete_inspections":   false,
			"can_manage_templates":     false,
			"can_manage_users":         false,
			"can_view_reports":         false,
			"can_export_reports":       false,
			"can_manage_organization":  false,
		}
	default:
		return map[string]interface{}{
			"can_create_inspections":   false,
			"can_view_all_inspections": false,
			"can_edit_inspections":     false,
			"can_delete_inspections":   false,
			"can_manage_templates":     false,
			"can_manage_users":         false,
			"can_view_reports":         false,
			"can_export_reports":       false,
			"can_manage_organization":  false,
		}
	}
}

// updateSessionActivity updates the last activity timestamp for the session
func updateSessionActivity(tokenString string) {
	go func() {
		now := time.Now()
		config.DB.Model(&models.UserSession{}).
			Where("token = ?", tokenString).
			Update("last_activity_at", &now)
	}()
}

// isSecurePublicEndpoint checks if the endpoint doesn't require authentication
func isSecurePublicEndpoint(path string) bool {
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

// RequireSecureRole provides role-based authorization using consolidated auth
func RequireSecureRole(requiredRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "User role not found",
				"code":  "MISSING_ROLE",
			})
			c.Abort()
			return
		}

		currentRole := userRole.(string)

		// Admin can access everything unless using strict mode
		if currentRole == "admin" {
			c.Next()
			return
		}

		// Check if user role matches any of the required roles
		for _, role := range requiredRoles {
			if currentRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": "Insufficient role permissions",
			"code":  "INSUFFICIENT_ROLE",
			"required_roles": requiredRoles,
			"current_role": currentRole,
		})
		c.Abort()
	}
}

// RequireSecurePermission provides permission-based authorization
func RequireSecurePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		permissions, exists := c.Get("user_permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Permissions not found",
				"code":  "MISSING_PERMISSIONS",
			})
			c.Abort()
			return
		}

		permsMap, ok := permissions.(map[string]interface{})
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Invalid permissions format",
				"code":  "INVALID_PERMISSIONS",
			})
			c.Abort()
			return
		}

		if hasPermission, exists := permsMap[permission]; !exists || !hasPermission.(bool) {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "Permission denied: " + permission,
				"code":  "PERMISSION_DENIED",
				"required_permission": permission,
			})
			c.Abort()
			return
		}
		c.Next()
	}
}