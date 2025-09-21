package middleware

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

type Claims struct {
	UserID         string                 `json:"user_id"`
	OrganizationID string                 `json:"organization_id"`
	Email          string                 `json:"email"`
	Role           string                 `json:"role"`
	Permissions    map[string]interface{} `json:"permissions"`
	jwt.RegisteredClaims
}

// DEPRECATED: Use pkg/utils.GetJWTSecret() instead for secure secret management
func getJWTSecret() []byte {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		// SECURITY VULNERABILITY: No fallback secrets allowed
		panic("JWT_SECRET environment variable is required - no fallback allowed for security")
	}
	if len(secret) < 32 {
		panic("JWT_SECRET must be at least 32 characters long")
	}
	return []byte(secret)
}

func GenerateToken(userID, organizationID, email, role string, permissions map[string]interface{}) (string, error) {
	expirationTime := time.Now().Add(24 * time.Hour) // 24 hours

	claims := &Claims{
		UserID:         userID,
		OrganizationID: organizationID,
		Email:          email,
		Role:           role,
		Permissions:    permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "resource-mgmt",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(getJWTSecret())
}

func ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		return getJWTSecret(), nil
	})

	if err != nil {
		return nil, err
	}

	if claims, ok := token.Claims.(*Claims); ok && token.Valid {
		return claims, nil
	}

	return nil, jwt.ErrSignatureInvalid
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Bearer token required"})
			c.Abort()
			return
		}

		// All tokens must be valid JWTs - no dev shortcuts

		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Set user information in context
		c.Set("user_id", claims.UserID)
		c.Set("organization_id", claims.OrganizationID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("user_permissions", claims.Permissions)

		c.Next()
	}
}

func RequireRole(requiredRole ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		currentRole := userRole.(string)

		// Admin can access everything
		if currentRole == "admin" {
			c.Next()
			return
		}

		// Check if user role matches any of the required roles
		for _, role := range requiredRole {
			if currentRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient role permissions"})
		c.Abort()
	}
}

// RequireRoleStrict - Admin privilege doesn't bypass this check
func RequireRoleStrict(requiredRole ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User role not found"})
			c.Abort()
			return
		}

		currentRole := userRole.(string)

		// Check if user role matches any of the required roles
		for _, role := range requiredRole {
			if currentRole == role {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient role permissions"})
		c.Abort()
	}
}

func RequirePermission(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userRole, exists := c.Get("user_role")
		fmt.Printf("DEBUG: RequirePermission - userRole exists: %v, userRole: %v\n", exists, userRole)
		if exists && userRole != nil {
			if roleStr, ok := userRole.(string); ok && roleStr == "admin" {
				fmt.Printf("DEBUG: Admin user detected, bypassing permission check\n")
				c.Next()
				return
			}
		}

		permissions, exists := c.Get("user_permissions")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permissions not found"})
			c.Abort()
			return
		}

		permsMap, ok := permissions.(map[string]interface{})
		if !ok {
			c.JSON(http.StatusForbidden, gin.H{"error": "Invalid permissions format"})
			c.Abort()
			return
		}

		if hasPermission, exists := permsMap[permission]; !exists || !hasPermission.(bool) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Permission denied: " + permission})
			c.Abort()
			return
		}

		c.Next()
	}
}

// Optional auth middleware - doesn't block if no token provided
func OptionalAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.Next()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		if tokenString == authHeader {
			c.Next()
			return
		}

		claims, err := ValidateToken(tokenString)
		if err != nil {
			c.Next()
			return
		}

		// Set user information in context if valid token
		c.Set("user_id", claims.UserID)
		c.Set("organization_id", claims.OrganizationID)
		c.Set("user_email", claims.Email)
		c.Set("user_role", claims.Role)
		c.Set("user_permissions", claims.Permissions)

		c.Next()
	}
}
