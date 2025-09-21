package handlers

import (
	"net/http"
	"resource-mgmt/services"
	"strconv"

	"github.com/gin-gonic/gin"
)

type AnalyticsHandler struct {
	analyticsService *services.AnalyticsService
}

func NewAnalyticsHandler(analyticsService *services.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsService: analyticsService,
	}
}

func (h *AnalyticsHandler) GetDashboardStats(c *gin.Context) {
	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	organizationID := orgID.(string)

	// Parse query parameters for filters
	filters := make(map[string]interface{})

	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	if inspectorID := c.Query("inspector_id"); inspectorID != "" {
		filters["inspector_id"] = inspectorID
	}

	stats, err := h.analyticsService.GetDashboardStats(organizationID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get dashboard stats: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

func (h *AnalyticsHandler) ExportReport(c *gin.Context) {
	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	organizationID := orgID.(string)

	// Get format from path parameter
	format := c.Param("format")
	if format != "csv" && format != "json" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Unsupported format. Use 'csv' or 'json'"})
		return
	}

	// Parse query parameters for filters
	filters := make(map[string]interface{})

	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if priority := c.Query("priority"); priority != "" {
		filters["priority"] = priority
	}

	// Generate report
	data, filename, err := h.analyticsService.ExportInspectionReport(organizationID, format, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate report: " + err.Error()})
		return
	}

	// Set appropriate headers for file download
	var contentType string
	switch format {
	case "csv":
		contentType = "text/csv"
	case "json":
		contentType = "application/json"
	}

	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", contentType)
	c.Header("Content-Length", strconv.Itoa(len(data)))

	c.Data(http.StatusOK, contentType, data)
}

func (h *AnalyticsHandler) GetInspectionMetrics(c *gin.Context) {
	// Get organization ID from context
	orgID, exists := c.Get("organization_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Organization context not found"})
		return
	}

	organizationID := orgID.(string)

	// Parse query parameters
	filters := make(map[string]interface{})

	if startDate := c.Query("start_date"); startDate != "" {
		filters["start_date"] = startDate
	}
	if endDate := c.Query("end_date"); endDate != "" {
		filters["end_date"] = endDate
	}
	if inspectorID := c.Query("inspector_id"); inspectorID != "" {
		filters["inspector_id"] = inspectorID
	}

	// Get only the inspection stats part
	stats, err := h.analyticsService.GetDashboardStats(organizationID, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get inspection metrics: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats.InspectionStats,
	})
}