package handlers

import (
	"log"
	"net/http"
	"resource-mgmt/models"
	"resource-mgmt/services"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type TemplateHandler struct {
	service *services.TemplateService
}

func NewTemplateHandler(service *services.TemplateService) *TemplateHandler {
	return &TemplateHandler{service: service}
}

func (h *TemplateHandler) GetTemplates(c *gin.Context) {
	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	category := c.Query("category")
	isActive := c.Query("active")
	limit := c.DefaultQuery("limit", "20")
	offset := c.DefaultQuery("offset", "0")

	limitInt, _ := strconv.Atoi(limit)
	offsetInt, _ := strconv.Atoi(offset)

	templates, total, err := h.service.GetTemplates(orgID.(string), category, isActive, limitInt, offsetInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"templates": templates,
		"total":     total,
		"limit":     limitInt,
		"offset":    offsetInt,
	})
}

func (h *TemplateHandler) GetTemplate(c *gin.Context) {
	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	idParam := c.Param("id")
	log.Printf("Received template ID param: %s", idParam)

	id, err := uuid.Parse(idParam)
	if err != nil {
		log.Printf("Error parsing template ID: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	log.Printf("Parsed template ID: %s", id)

	template, err := h.service.GetTemplateByUUID(id, orgID.(string))
	if err != nil {
		log.Printf("Error finding template with ID %s: %v", id, err)
		c.JSON(http.StatusNotFound, gin.H{"error": "Template not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"template": template})
}

func (h *TemplateHandler) CreateTemplate(c *gin.Context) {
	var req models.CreateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	template, err := h.service.CreateTemplate(c.Request.Context(), &req, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, template)
}

func (h *TemplateHandler) UpdateTemplate(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	var req models.UpdateTemplateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	template, err := h.service.UpdateTemplateByUUID(id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, template)
}

func (h *TemplateHandler) DeleteTemplate(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	err = h.service.DeleteTemplateByUUID(id)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Template deleted successfully"})
}

func (h *TemplateHandler) GetTemplateVersions(c *gin.Context) {
	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	versions, err := h.service.GetTemplateVersionsByUUID(id, orgID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"versions": versions})
}

func (h *TemplateHandler) GetTemplateVersion(c *gin.Context) {
	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	idParam := c.Param("id")
	versionParam := c.Param("version")

	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	version, err := strconv.Atoi(versionParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid version number"})
		return
	}

	template, err := h.service.GetTemplateByVersionUUID(id, version, orgID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, template)
}

func (h *TemplateHandler) CreateTemplateVersion(c *gin.Context) {
	// Get organization ID from JWT token
	_, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	var req struct {
		models.UpdateTemplateRequest
		VersionNotes string `json:"version_notes"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	versionNotes := req.VersionNotes
	if versionNotes == "" {
		versionNotes = "New version created"
	}

	template, err := h.service.UpdateTemplateWithVersioningByUUID(id, &req.UpdateTemplateRequest, versionNotes, true)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, template)
}

func (h *TemplateHandler) DuplicateTemplate(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template ID"})
		return
	}

	// Get user ID from JWT token
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found"})
		return
	}

	// Get organization ID from JWT token
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	userIDStr, ok := userID.(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID format"})
		return
	}

	template, err := h.service.DuplicateTemplateByUUID(id, userIDStr, orgID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, template)
}

func (h *TemplateHandler) GetTemplateCategories(c *gin.Context) {
	categories, err := h.service.GetCategories()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"categories": categories})
}
