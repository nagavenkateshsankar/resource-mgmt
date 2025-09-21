package handlers

import (
	"net/http"
	"resource-mgmt/models"
	"resource-mgmt/services"
	"resource-mgmt/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	service      *services.MultiOrgAuthService
	auditService *services.AuditService
}

func NewUserHandler(service *services.MultiOrgAuthService) *UserHandler {
	return &UserHandler{
		service:      service,
		auditService: services.NewAuditService(),
	}
}

func (h *UserHandler) GetUsers(c *gin.Context) {
	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	role := c.Query("role")
	status := c.Query("status")
	limit := c.DefaultQuery("limit", "20")
	offset := c.DefaultQuery("offset", "0")

	limitInt, _ := strconv.Atoi(limit)
	offsetInt, _ := strconv.Atoi(offset)

	// Build filters map
	filters := make(map[string]interface{})
	if role != "" {
		filters["role"] = role
	}
	if status != "" {
		filters["status"] = status
	}

	users, total, err := h.service.GetUsersWithFilters(c.Request.Context(), orgID.(string), filters, limitInt, offsetInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users":  users,
		"total":  total,
		"limit":  limitInt,
		"offset": offsetInt,
	})
}

func (h *UserHandler) GetUser(c *gin.Context) {
	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	id := c.Param("id")

	user, err := h.service.GetUserByID(c.Request.Context(), id, orgID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	currentUserID, _ := c.Get("user_id")
	var req models.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role if provided
	if req.Role != "" {
		if err := utils.ValidateRole(req.Role); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	user, err := h.service.CreateUser(c.Request.Context(), orgID.(string), &req)
	if err != nil {
		// Log failed user creation
		errorMsg := err.Error()
		h.auditService.LogUserAction(
			c.Request.Context(),
			services.UserCreated,
			currentUserID.(string),
			nil,
			map[string]interface{}{
				"email":        req.Email,
				"role":         req.Role,
				"error_reason": errorMsg,
			},
			false,
			&errorMsg,
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log successful user creation
	h.auditService.LogUserAction(
		c.Request.Context(),
		services.UserCreated,
		currentUserID.(string),
		&user.ID,
		map[string]interface{}{
			"created_user_email": user.Email,
			"created_user_role":  req.Role, // Use req.Role since user doesn't have Role field in GlobalUser
		},
		true,
		nil,
	)

	c.JSON(http.StatusCreated, user)
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")
	currentUserID, _ := c.Get("user_id")
	currentUserRole, _ := c.Get("user_role")
	orgID, _ := c.Get("organization_id")

	var req models.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Check if user is trying to modify themselves
	if currentUserID.(string) == id {
		// Users cannot change their own role
		if req.Role != "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot change your own role"})
			return
		}
		// Users cannot deactivate themselves
		if req.Status != nil && *req.Status != "active" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot deactivate your own account"})
			return
		}
	}

	// Only admins can change roles
	if req.Role != "" && currentUserRole.(string) != "admin" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only administrators can change user roles"})
		return
	}

	// Validate role if provided
	if req.Role != "" {
		if err := utils.ValidateRole(req.Role); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
	}

	// If changing role from admin, check if it's the last admin
	if req.Role != "" && req.Role != "admin" {
		// Check role from organization membership - need to get this differently
		// For now, assume we can check admin count if trying to change role from admin
		adminCount, err := h.service.GetOrganizationAdminCount(c.Request.Context(), orgID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin count"})
			return
		}
		if adminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot remove the last administrator from the organization"})
			return
		}
	}

	// If deactivating a user, check if it's the last active admin
	if req.Status != nil && *req.Status != "active" {
		targetUser, err := h.service.GetUserByID(c.Request.Context(), id, orgID.(string))
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
			return
		}

		if targetUser.Role == "admin" {
			activeAdminCount, err := h.service.GetActiveAdminCount(c.Request.Context(), orgID.(string))
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify active admin count"})
				return
			}
			if activeAdminCount <= 1 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot deactivate the last active administrator"})
				return
			}
		}
	}

	// Get original user data for audit trail
	originalUser, _ := h.service.GetUserByID(c.Request.Context(), id, orgID.(string))

	user, err := h.service.UpdateUser(c.Request.Context(), id, orgID.(string), &req)
	if err != nil {
		// Log failed update
		errorMsg := err.Error()
		h.auditService.LogUserAction(
			c.Request.Context(),
			services.UserUpdated,
			currentUserID.(string),
			&id,
			map[string]interface{}{
				"attempted_changes": req,
				"error_reason":      errorMsg,
			},
			false,
			&errorMsg,
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log successful update with details of what changed
	changes := make(map[string]interface{})
	if originalUser != nil {
		if req.Role != "" && req.Role != originalUser.Role {
			changes["role_changed"] = map[string]string{
				"from": originalUser.Role,
				"to":   req.Role,
			}
			// Special audit for role changes
			h.auditService.LogUserAction(
				c.Request.Context(),
				services.UserRoleChanged,
				currentUserID.(string),
				&id,
				map[string]interface{}{
					"old_role": originalUser.Role,
					"new_role": req.Role,
				},
				true,
				nil,
			)
		}
		if req.Status != nil && *req.Status != "active" {
			changes["status_changed"] = map[string]interface{}{
				"from": "active",
				"to":   *req.Status,
			}
			// Special audit for status changes
			h.auditService.LogUserAction(
				c.Request.Context(),
				services.UserStatusChanged,
				currentUserID.(string),
				&id,
				map[string]interface{}{
					"new_status": *req.Status,
				},
				true,
				nil,
			)
		}
	}

	h.auditService.LogUserAction(
		c.Request.Context(),
		services.UserUpdated,
		currentUserID.(string),
		&id,
		changes,
		true,
		nil,
	)

	c.JSON(http.StatusOK, user)
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	currentUserID, _ := c.Get("user_id")
	orgID, _ := c.Get("organization_id")

	// Prevent self-deletion
	if currentUserID.(string) == id {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete your own account"})
		return
	}

	// Get user to check their role
	targetUser, err := h.service.GetUserByID(c.Request.Context(), id, orgID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if deleting an admin and if it's the last admin
	// For GlobalUser, we need to check role via organization membership
	adminCount, err := h.service.GetOrganizationAdminCount(c.Request.Context(), orgID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify admin count"})
		return
	}
	if adminCount <= 1 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot delete the last administrator from the organization"})
		return
	}

	err = h.service.DeleteUser(c.Request.Context(), id, orgID.(string))
	if err != nil {
		// Log failed deletion
		errorMsg := err.Error()
		h.auditService.LogUserAction(
			c.Request.Context(),
			services.UserDeleted,
			currentUserID.(string),
			&id,
			map[string]interface{}{
				"target_user_email": targetUser.Email,
				"target_user_role":  targetUser.Role,
				"error_reason":      errorMsg,
			},
			false,
			&errorMsg,
		)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Log successful deletion
	h.auditService.LogUserAction(
		c.Request.Context(),
		services.UserDeleted,
		currentUserID.(string),
		&id,
		map[string]interface{}{
			"deleted_user_email": targetUser.Email,
			"deleted_user_role":  targetUser.Role,
		},
		true,
		nil,
	)

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

func (h *UserHandler) GetUserRoles(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"roles": utils.ValidRoles})
}

func (h *UserHandler) GetUserPermissions(c *gin.Context) {
	permissions := map[string]string{
		"can_create_inspections":   "Create new inspections",
		"can_view_own_inspections": "View own inspections",
		"can_view_all_inspections": "View all inspections",
		"can_edit_inspections":     "Edit inspections",
		"can_delete_inspections":   "Delete inspections",
		"can_create_templates":     "Create inspection templates",
		"can_edit_templates":       "Edit inspection templates",
		"can_delete_templates":     "Delete inspection templates",
		"can_manage_users":         "Manage user accounts",
		"can_view_reports":         "View inspection reports",
		"can_export_reports":       "Export inspection reports",
		"can_upload_files":         "Upload files and attachments",
		"can_manage_notifications": "Manage notifications",
	}

	c.JSON(http.StatusOK, gin.H{"permissions": permissions})
}

// GetAdminCount returns the current count of admin users in the organization
func (h *UserHandler) GetAdminCount(c *gin.Context) {
	orgID, _ := c.Get("organization_id")

	count, err := h.service.GetOrganizationAdminCount(c.Request.Context(), orgID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get admin count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// ToggleUserStatus handles enabling/disabling user accounts
func (h *UserHandler) ToggleUserStatus(c *gin.Context) {
	id := c.Param("id")
	currentUserID, _ := c.Get("user_id")
	orgID, _ := c.Get("organization_id")

	var req struct {
		Status string `json:"status" binding:"required,oneof=active inactive"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Prevent self-deactivation
	if currentUserID.(string) == id && req.Status != "active" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot deactivate your own account"})
		return
	}

	// If deactivating an admin, check if it's the last active admin
	// For GlobalUser, we need to check role via organization membership
	if req.Status != "active" {
		activeAdminCount, err := h.service.GetActiveAdminCount(c.Request.Context(), orgID.(string))
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify active admin count"})
			return
		}
		if activeAdminCount <= 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Cannot deactivate the last active administrator"})
			return
		}
	}

	// Update user status
	updateReq := models.UpdateUserRequest{
		Status: &req.Status,
	}

	user, err := h.service.UpdateUser(c.Request.Context(), id, orgID.(string), &updateReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}
