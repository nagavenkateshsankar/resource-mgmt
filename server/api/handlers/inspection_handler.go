package handlers

import (
	"log"
	"net/http"
	"resource-mgmt/models"
	"resource-mgmt/services"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type InspectionHandler struct {
	service *services.InspectionService
}

func NewInspectionHandler(service *services.InspectionService) *InspectionHandler {
	return &InspectionHandler{service: service}
}

func (h *InspectionHandler) GetInspections(c *gin.Context) {
	inspectorID := c.Query("inspector_id")
	status := c.Query("status")
	limit := c.DefaultQuery("limit", "20")
	offset := c.DefaultQuery("offset", "0")

	limitInt, _ := strconv.Atoi(limit)
	offsetInt, _ := strconv.Atoi(offset)

	inspections, total, err := h.service.GetInspections(c.Request.Context(), inspectorID, status, limitInt, offsetInt)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"inspections": inspections,
		"total":       total,
		"limit":       limitInt,
		"offset":      offsetInt,
	})
}

func (h *InspectionHandler) GetInspection(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	inspection, err := h.service.GetInspectionByID(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Inspection not found"})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

type CreateInspectionAPIRequest struct {
	TemplateID     string                 `json:"template_id" binding:"required"`
	InspectorID    string                 `json:"inspector_id" binding:"required"`
	AssignedBy     *string                `json:"assigned_by"`
	SiteID         string                 `json:"site_id" binding:"required"`
	Priority       string                 `json:"priority"`
	ScheduledFor   *string                `json:"scheduled_for"`
	DueDate        *string                `json:"due_date"`
	Notes          string                 `json:"notes"`
	Status         string                 `json:"status"`
	InspectionData map[string]interface{} `json:"inspection_data"`
}

func (h *InspectionHandler) CreateInspection(c *gin.Context) {
	var apiReq CreateInspectionAPIRequest
	if err := c.ShouldBindJSON(&apiReq); err != nil {
		log.Printf("Error binding request: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("API request: %+v", apiReq)

	// Convert string template_id to UUID
	templateID, err := uuid.Parse(apiReq.TemplateID)
	if err != nil {
		log.Printf("Error parsing template_id: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid template_id"})
		return
	}

	// Parse due_date string to time.Time
	var dueDate *time.Time
	if apiReq.DueDate != nil && *apiReq.DueDate != "" {
		// Try parsing as date first (YYYY-MM-DD)
		if parsedTime, err := time.Parse("2006-01-02", *apiReq.DueDate); err == nil {
			dueDate = &parsedTime
		} else {
			// Try parsing as RFC3339 format
			if parsedTime, err := time.Parse(time.RFC3339, *apiReq.DueDate); err == nil {
				dueDate = &parsedTime
			} else {
				log.Printf("Error parsing due_date: %v", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date format. Use YYYY-MM-DD or RFC3339"})
				return
			}
		}
	}

	// Parse scheduled_for string to time.Time
	var scheduledFor *time.Time
	if apiReq.ScheduledFor != nil && *apiReq.ScheduledFor != "" {
		// Try parsing as date first (YYYY-MM-DD)
		if parsedTime, err := time.Parse("2006-01-02", *apiReq.ScheduledFor); err == nil {
			scheduledFor = &parsedTime
		} else {
			// Try parsing as RFC3339 format
			if parsedTime, err := time.Parse(time.RFC3339, *apiReq.ScheduledFor); err == nil {
				scheduledFor = &parsedTime
			} else {
				log.Printf("Error parsing scheduled_for: %v", err)
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid scheduled_for format. Use YYYY-MM-DD or RFC3339"})
				return
			}
		}
	}

	// Handle inspector_id auto-assignment
	inspectorID := apiReq.InspectorID
	if inspectorID == "auto" || inspectorID == "" {
		// Get user ID from JWT token for auto-assignment
		userID, exists := c.Get("user_id")
		if !exists {
			log.Printf("User ID not found in JWT context")
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
			return
		}
		inspectorID = userID.(string)
	}

	// Convert to service request
	req := &models.CreateInspectionRequest{
		TemplateID:  templateID,
		InspectorID: inspectorID,
		AssignedBy:  apiReq.AssignedBy,
		SiteID:      apiReq.SiteID,
		Priority:    apiReq.Priority,
		ScheduledFor: scheduledFor,
		DueDate:     dueDate,
		Notes:       apiReq.Notes,
		Status:      apiReq.Status,
	}

	log.Printf("Service request: %+v", req)

	inspection, err := h.service.CreateInspection(c.Request.Context(), req)
	if err != nil {
		log.Printf("Error creating inspection: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// If inspection data is provided, save it
	if len(apiReq.InspectionData) > 0 {
		submitReq := &models.SubmitInspectionRequest{
			FormData: apiReq.InspectionData,
			Status:   apiReq.Status,
		}

		inspection, err = h.service.SubmitInspection(c.Request.Context(), inspection.ID, submitReq)
		if err != nil {
			log.Printf("Error saving inspection data: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save inspection data: " + err.Error()})
			return
		}
	}

	c.JSON(http.StatusCreated, inspection)
}

func (h *InspectionHandler) UpdateInspection(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	var req models.UpdateInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inspection, err := h.service.UpdateInspection(c.Request.Context(), uint(id), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

func (h *InspectionHandler) DeleteInspection(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	err = h.service.DeleteInspection(c.Request.Context(), uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Inspection deleted successfully"})
}

func (h *InspectionHandler) SubmitInspection(c *gin.Context) {
	idParam := c.Param("id")
	id, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	var req models.SubmitInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inspection, err := h.service.SubmitInspection(c.Request.Context(), id, &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

func (h *InspectionHandler) AssignInspection(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	var req models.AssignInspectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inspection, err := h.service.AssignInspection(c.Request.Context(), uint(id), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inspection)
}

func (h *InspectionHandler) UpdateInspectionStatus(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	var req models.UpdateInspectionStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	inspection, err := h.service.UpdateInspectionStatus(c.Request.Context(), uint(id), &req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, inspection)
}
