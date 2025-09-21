package handlers

import (
	"net/http"
	"resource-mgmt/config"
	"resource-mgmt/models"
	"resource-mgmt/services"
	"resource-mgmt/utils"
	"strconv"

	"github.com/gin-gonic/gin"
)

type OrganizationHandler struct {
	organizationService *services.OrganizationService
}

func NewOrganizationHandler() *OrganizationHandler {
	return &OrganizationHandler{
		organizationService: services.NewOrganizationService(),
	}
}

// CreateOrganization handles organization registration
func (h *OrganizationHandler) CreateOrganization(c *gin.Context) {
	var req models.CreateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	org, adminUser, err := h.organizationService.CreateOrganization(&req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"organization": org,
		"admin_user":   adminUser,
		"message":      "Organization created successfully",
	}

	c.JSON(http.StatusCreated, response)
}

// GetOrganization retrieves organization details
func (h *OrganizationHandler) GetOrganization(c *gin.Context) {
	orgID := c.Param("id")

	org, err := h.organizationService.GetOrganizationByID(orgID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, org)
}

// UpdateOrganization updates organization details
func (h *OrganizationHandler) UpdateOrganization(c *gin.Context) {
	orgID := c.Param("id")

	var req models.UpdateOrganizationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	org, err := h.organizationService.UpdateOrganization(orgID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, org)
}

// InviteUser handles inviting a user to the organization
func (h *OrganizationHandler) InviteUser(c *gin.Context) {
	orgID := c.Param("id")

	var req models.InviteUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate role
	if err := utils.ValidateRole(req.Role); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get the user ID from JWT context (will be added when we update auth middleware)
	invitedBy, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	user, err := h.organizationService.InviteUser(orgID, &req, invitedBy.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"user":    user,
		"message": "User invited successfully",
	})
}

// ListOrganizations lists all organizations (for system admin)
func (h *OrganizationHandler) ListOrganizations(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "10")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil {
		limit = 10
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil {
		offset = 0
	}

	orgs, total, err := h.organizationService.ListOrganizations(limit, offset)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"organizations": orgs,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

// CheckDomain checks if a domain is available
func (h *OrganizationHandler) CheckDomain(c *gin.Context) {
	domain := c.Query("domain")
	if domain == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Domain parameter is required"})
		return
	}

	_, err := h.organizationService.GetOrganizationByDomain(domain)
	if err != nil {
		// Domain not found, so it's available
		c.JSON(http.StatusOK, gin.H{
			"available": true,
			"domain":    domain,
		})
		return
	}

	// Domain exists
	c.JSON(http.StatusOK, gin.H{
		"available": false,
		"domain":    domain,
		"message":   "Domain is already taken",
	})
}

// SeedTemplates creates default templates for the current organization
func (h *OrganizationHandler) SeedTemplates(c *gin.Context) {
	// Get organization ID from JWT context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization not found in context"})
		return
	}

	// Create template seeder and seed templates for this organization
	templateSeeder := services.NewTemplateSeeder(config.DB)
	err := templateSeeder.SeedTemplatesForOrganization(orgID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to seed templates: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":        "Default templates created successfully",
		"organization_id": orgID,
	})
}
