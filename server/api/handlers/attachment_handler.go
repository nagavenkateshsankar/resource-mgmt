package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"resource-mgmt/models"
	"resource-mgmt/services"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AttachmentHandler struct {
	service        *services.AttachmentService
	storageService *services.StorageService
	uploadDir      string
}

func NewAttachmentHandler(service *services.AttachmentService, storageService *services.StorageService, uploadDir string) *AttachmentHandler {
	return &AttachmentHandler{
		service:        service,
		storageService: storageService,
		uploadDir:      uploadDir,
	}
}

func (h *AttachmentHandler) UploadFile(c *gin.Context) {
	inspectionIDParam := c.Param("id")
	inspectionID, err := uuid.Parse(inspectionIDParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	// Parse multipart form
	err = c.Request.ParseMultipartForm(10 << 20) // 10 MB limit
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to parse form"})
		return
	}

	file, header, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}
	defer file.Close()

	// Validate file type
	allowedTypes := []string{
		"image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
		"application/pdf", "text/plain", "application/msword",
		"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	}

	contentType := header.Header.Get("Content-Type")
	if !isAllowedFileType(contentType, allowedTypes) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File type not allowed"})
		return
	}

	// Validate file size using storage service helper
	if !services.IsValidFileSize(header.Size, 10) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "File size too large (max 10MB)"})
		return
	}

	// Get field ID and name from form
	fieldID := c.Request.FormValue("field_id")
	fieldName := c.Request.FormValue("field_name")

	// Upload file using storage service
	uploadPath := fmt.Sprintf("inspections/%d/attachments", inspectionID)
	result, err := h.storageService.UploadFile(context.Background(), header, uploadPath)
	if err != nil {
		log.Printf("Error uploading file: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload file"})
		return
	}

	// Get description from form
	description := c.Request.FormValue("description")

	// Create attachment record
	req := &models.CreateAttachmentRequest{
		InspectionID: inspectionID,
		FileName:     result.OriginalName,
		FilePath:     result.Path,
		FileType:     result.MimeType,
		FileSize:     result.Size,
		Description:  description,
		FieldID:      fieldID,
		FieldName:    fieldName,
		StorageURL:   result.URL,
	}

	attachment, err := h.service.CreateAttachment(req)
	if err != nil {
		// Clean up file if database save fails
		h.storageService.DeleteFile(context.Background(), result.Path)
		log.Printf("Error creating attachment record: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save attachment"})
		return
	}

	// Return the upload result with attachment info
	response := gin.H{
		"id":           attachment.ID,
		"file_name":    result.FileName,
		"original_name": result.OriginalName,
		"size":         result.Size,
		"mime_type":    result.MimeType,
		"url":          result.URL,
		"path":         result.Path,
		"uploaded_at":  result.UploadedAt,
		"field_id":     fieldID,
		"field_name":   fieldName,
		"description":  description,
	}

	c.JSON(http.StatusCreated, response)
}

func (h *AttachmentHandler) GetAttachments(c *gin.Context) {
	inspectionIDParam := c.Param("id")
	inspectionID, err := strconv.ParseUint(inspectionIDParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid inspection ID"})
		return
	}

	attachments, err := h.service.GetAttachmentsByInspection(uint(inspectionID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"attachments": attachments})
}

func (h *AttachmentHandler) GetAttachment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attachment ID"})
		return
	}

	attachment, err := h.service.GetAttachmentByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attachment not found"})
		return
	}

	c.JSON(http.StatusOK, attachment)
}

func (h *AttachmentHandler) DownloadFile(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attachment ID"})
		return
	}

	attachment, err := h.service.GetAttachmentByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attachment not found"})
		return
	}

	// For cloud storage, redirect to the direct URL
	if attachment.StorageURL != "" {
		c.Redirect(http.StatusFound, attachment.StorageURL)
		return
	}

	// For local storage, serve the file directly
	if _, err := os.Stat(attachment.FilePath); os.IsNotExist(err) {
		c.JSON(http.StatusNotFound, gin.H{"error": "File not found on disk"})
		return
	}

	// Set headers for file download
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"%s\"", attachment.FileName))
	c.Header("Content-Type", attachment.FileType)
	c.Header("Content-Length", fmt.Sprintf("%d", attachment.FileSize))

	// Serve file
	c.File(attachment.FilePath)
}

func (h *AttachmentHandler) DeleteAttachment(c *gin.Context) {
	idParam := c.Param("id")
	id, err := strconv.ParseUint(idParam, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid attachment ID"})
		return
	}

	attachment, err := h.service.GetAttachmentByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Attachment not found"})
		return
	}

	// Delete file from storage (cloud or local)
	if err := h.storageService.DeleteFile(context.Background(), attachment.FilePath); err != nil {
		log.Printf("Warning: Failed to delete file from storage: %v", err)
	}

	// Delete from database
	err = h.service.DeleteAttachment(uint(id))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Attachment deleted successfully"})
}

func isAllowedFileType(contentType string, allowedTypes []string) bool {
	for _, allowedType := range allowedTypes {
		if contentType == allowedType {
			return true
		}
	}
	return false
}