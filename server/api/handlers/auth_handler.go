package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"resource-mgmt/config"
	"resource-mgmt/middleware"
	"resource-mgmt/models"
	"resource-mgmt/services"
	"resource-mgmt/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	"golang.org/x/oauth2/microsoft"
)

type AuthHandler struct {
	userService     *services.UserService
	multiOrgService *services.MultiOrgAuthService
}

var googleOAuthConfig = &oauth2.Config{
	ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
	ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
	RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URL"),
	Scopes:       []string{"openid", "email", "profile"},
	Endpoint:     google.Endpoint,
}

var microsoftOAuthConfig = &oauth2.Config{
	ClientID:     os.Getenv("MICROSOFT_CLIENT_ID"),
	ClientSecret: os.Getenv("MICROSOFT_CLIENT_SECRET"),
	RedirectURL:  os.Getenv("MICROSOFT_REDIRECT_URL"),
	Scopes:       []string{"openid", "email", "profile"},
	Endpoint:     microsoft.AzureADEndpoint("common"),
}

// Google OAuth login handler
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	url := googleOAuthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// Google OAuth callback handler
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code in callback"})
		return
	}
	token, err := googleOAuthConfig.Exchange(c, code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to exchange token"})
		return
	}
	client := googleOAuthConfig.Client(c, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v2/userinfo")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()
	var userInfo struct {
		ID    string `json:"id"`
		Email string `json:"email"`
		Name  string `json:"name"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode user info"})
		return
	}
	// Check if user exists
	user, err := h.userService.GetUserByEmail(c.Request.Context(), userInfo.Email)
	if err != nil {
		// Create new user
		createReq := &models.CreateUserRequest{
			Name:        userInfo.Name,
			Email:       userInfo.Email,
			Role:        "inspector", // default role
			Permissions: map[string]interface{}{},
		}
		user, err = h.userService.CreateUser(c.Request.Context(), createReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	}
	// Parse permissions JSON
	var permissions map[string]interface{}
	err = json.Unmarshal(user.Permissions, &permissions)
	if err != nil || len(permissions) == 0 {
		// If permissions parsing fails or permissions are empty, use default permissions for the role
		permissions = utils.GetDefaultPermissions(user.Role)
	}
	tokenStr, err := middleware.GenerateToken(user.ID, user.OrganizationID, user.Email, user.Role, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenStr, "user": user})
}

// Microsoft OAuth login handler
func (h *AuthHandler) MicrosoftLogin(c *gin.Context) {
	url := microsoftOAuthConfig.AuthCodeURL("state-token", oauth2.AccessTypeOffline)
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// Microsoft OAuth callback handler
func (h *AuthHandler) MicrosoftCallback(c *gin.Context) {
	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing code in callback"})
		return
	}
	token, err := microsoftOAuthConfig.Exchange(c, code)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to exchange token"})
		return
	}
	client := microsoftOAuthConfig.Client(c, token)
	resp, err := client.Get("https://graph.microsoft.com/v1.0/me")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user info"})
		return
	}
	defer resp.Body.Close()
	var userInfo struct {
		ID    string `json:"id"`
		Email string `json:"mail"`
		Name  string `json:"displayName"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&userInfo); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode user info"})
		return
	}
	// Check if user exists
	user, err := h.userService.GetUserByEmail(c.Request.Context(), userInfo.Email)
	if err != nil {
		// Create new user
		createReq := &models.CreateUserRequest{
			Name:        userInfo.Name,
			Email:       userInfo.Email,
			Role:        "inspector", // default role
			Permissions: map[string]interface{}{},
		}
		user, err = h.userService.CreateUser(c.Request.Context(), createReq)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user"})
			return
		}
	}
	// Parse permissions JSON
	var permissions map[string]interface{}
	err = json.Unmarshal(user.Permissions, &permissions)
	if err != nil || len(permissions) == 0 {
		// If permissions parsing fails or permissions are empty, use default permissions for the role
		permissions = utils.GetDefaultPermissions(user.Role)
	}
	tokenStr, err := middleware.GenerateToken(user.ID, user.OrganizationID, user.Email, user.Role, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"token": tokenStr, "user": user})
}

func NewAuthHandler(userService *services.UserService) *AuthHandler {
	return &AuthHandler{
		userService:     userService,
		multiOrgService: services.NewMultiOrgAuthService(),
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req services.MultiOrgLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response, err := h.multiOrgService.Login(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role if provided (registration defaults to inspector if role is empty)
	if req.Role != "" {
		if err := utils.ValidateRole(req.Role); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	user, err := h.userService.CreateUser(c.Request.Context(), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Parse permissions JSON
	var permissions map[string]interface{}
	err = json.Unmarshal(user.Permissions, &permissions)
	if err != nil || len(permissions) == 0 {
		// If permissions parsing fails or permissions are empty, use default permissions for the role
		permissions = utils.GetDefaultPermissions(user.Role)
	}

	token, err := middleware.GenerateToken(user.ID, user.OrganizationID, user.Email, user.Role, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"token": token,
		"user":  user,
	})
}

func (h *AuthHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// Get user from global_users table with UUID-based lookup
	var user models.GlobalUser
	err := config.DB.Where("id = ? AND deleted_at IS NULL", userID.(string)).First(&user).Error
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Get user's organization memberships
	organizations, err := h.multiOrgService.GetUserOrganizations(c.Request.Context(), userID.(string))
	if err != nil {
		// Log error but don't fail the request - user data is more important
		organizations = []models.OrganizationMemberInfo{}
	}

	// Build response similar to MultiOrgLoginResponse format
	response := gin.H{
		"id":                user.ID,
		"email":             user.Email,
		"name":              user.Name,
		"avatar_url":        user.AvatarURL,
		"phone":             user.Phone,
		"email_verified":    user.EmailVerified,
		"email_verified_at": user.EmailVerifiedAt,
		"last_login_at":     user.LastLoginAt,
		"preferences":       user.Preferences,
		"created_at":        user.CreatedAt,
		"updated_at":        user.UpdatedAt,
		"deleted_at":        user.DeletedAt,
		"memberships":       organizations,
	}

	c.JSON(http.StatusOK, response)
}

func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.userService.UpdateUser(c.Request.Context(), userID.(string), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	var req struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=6"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.userService.ChangePassword(c.Request.Context(), userID.(string), req.CurrentPassword, req.NewPassword)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password changed successfully"})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	user, err := h.userService.GetUserByID(c.Request.Context(), userID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Parse permissions JSON
	var permissions map[string]interface{}
	err = json.Unmarshal(user.Permissions, &permissions)
	if err != nil || len(permissions) == 0 {
		// If permissions parsing fails or permissions are empty, use default permissions for the role
		permissions = utils.GetDefaultPermissions(user.Role)
	}

	token, err := middleware.GenerateToken(user.ID, user.OrganizationID, user.Email, user.Role, permissions)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}
