package handlers

import (
	"net/http"
	"resource-mgmt/models"
	"resource-mgmt/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type SiteHandler struct {
	siteService *services.SiteService
}

func NewSiteHandler(siteService *services.SiteService) *SiteHandler {
	return &SiteHandler{
		siteService: siteService,
	}
}

// GetSites handles GET /api/v1/sites
func (h *SiteHandler) GetSites(c *gin.Context) {
	organizationID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization ID not found"})
		return
	}

	// Query parameters
	status := c.Query("status")
	siteType := c.Query("type")
	search := c.Query("search")

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	filters := map[string]interface{}{
		"organization_id": organizationID.(string),
	}

	if status != "" {
		filters["status"] = status
	}
	if siteType != "" {
		filters["type"] = siteType
	}

	sites, total, err := h.siteService.GetSites(filters, search, page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch sites"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"sites": sites,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetSite handles GET /api/v1/sites/:id
func (h *SiteHandler) GetSite(c *gin.Context) {
	siteID := c.Param("id")
	organizationID, _ := c.Get("organization_id")

	site, err := h.siteService.GetSite(siteID, organizationID.(string))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Site not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"site": site})
}

// CreateSite handles POST /api/v1/sites
func (h *SiteHandler) CreateSite(c *gin.Context) {
	organizationID, _ := c.Get("organization_id")
	userID, _ := c.Get("user_id")

	var req models.Site
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Set organization and creator
	req.OrganizationID = organizationID.(string)
	req.CreatedBy = userID.(string)
	req.UpdatedBy = userID.(string)

	// Validate required fields
	if req.Name == "" || req.Address == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name and address are required"})
		return
	}

	site, err := h.siteService.CreateSite(&req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create site"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"site": site})
}

// UpdateSite handles PUT /api/v1/sites/:id
func (h *SiteHandler) UpdateSite(c *gin.Context) {
	siteID := c.Param("id")
	organizationID, _ := c.Get("organization_id")
	userID, _ := c.Get("user_id")

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request data"})
		return
	}

	// Set updater
	updates["updated_by"] = userID.(string)

	site, err := h.siteService.UpdateSite(siteID, organizationID.(string), updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update site"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"site": site})
}

// DeleteSite handles DELETE /api/v1/sites/:id
func (h *SiteHandler) DeleteSite(c *gin.Context) {
	siteID := c.Param("id")
	organizationID, _ := c.Get("organization_id")

	err := h.siteService.DeleteSite(siteID, organizationID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete site"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Site deleted successfully"})
}

// GetSiteStats handles GET /api/v1/sites/:id/stats
func (h *SiteHandler) GetSiteStats(c *gin.Context) {
	siteID := c.Param("id")
	organizationID, _ := c.Get("organization_id")

	stats, err := h.siteService.GetSiteStats(siteID, organizationID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch site statistics"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"stats": stats})
}

// GetSiteInspections handles GET /api/v1/sites/:id/inspections
func (h *SiteHandler) GetSiteInspections(c *gin.Context) {
	siteID := c.Param("id")
	organizationID, _ := c.Get("organization_id")

	// Pagination
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "10"))

	inspections, total, err := h.siteService.GetSiteInspections(siteID, organizationID.(string), page, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch site inspections"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"inspections": inspections,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetActiveSites handles GET /api/v1/sites/active - for dropdowns
func (h *SiteHandler) GetActiveSites(c *gin.Context) {
	organizationID, _ := c.Get("organization_id")

	sites, err := h.siteService.GetActiveSites(organizationID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch active sites"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"sites": sites})
}