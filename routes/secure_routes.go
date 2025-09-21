package routes

import (
	"resource-mgmt/config"
	"resource-mgmt/handlers"
	"resource-mgmt/middleware"
	"resource-mgmt/pkg/repository"
	"resource-mgmt/services"

	"github.com/gin-gonic/gin"
)

// SetupSecureRoutes configures routes using the new secure authentication middleware
func SetupSecureRoutes(r *gin.Engine) {
	// Initialize repository manager
	repoManager := repository.NewRepositoryManager(config.DB)

	// Initialize services
	inspectionService := services.NewInspectionService(repoManager)
	templateService := services.NewTemplateService()
	userService := services.NewUserService(repoManager)
	multiOrgAuthService := services.NewMultiOrgAuthService()
	attachmentService := services.NewAttachmentService()
	analyticsService := services.NewAnalyticsService()
	siteService := services.NewSiteService(config.DB)
	orgValidator := services.NewOrganizationValidator()
	notificationService := services.NewNotificationService()
	workflowService := services.NewWorkflowService(config.DB, notificationService)

	// Initialize storage service
	storageConfig := services.GetStorageConfigFromEnv()
	storageService, err := services.NewStorageService(storageConfig)
	if err != nil {
		panic("Failed to initialize storage service: " + err.Error())
	}

	// Initialize handlers
	inspectionHandler := handlers.NewInspectionHandler(inspectionService)
	templateHandler := handlers.NewTemplateHandler(templateService)
	authHandler := handlers.NewAuthHandler(userService)
	userHandler := handlers.NewUserHandler(multiOrgAuthService)
	organizationHandler := handlers.NewOrganizationHandler()
	attachmentHandler := handlers.NewAttachmentHandler(attachmentService, storageService, "./uploads")
	analyticsHandler := handlers.NewAnalyticsHandler(analyticsService)
	siteHandler := handlers.NewSiteHandler(siteService)
	workflowHandler := handlers.NewWorkflowHandler(config.DB, workflowService)

	// API v1 routes
	api := r.Group("/api/v1")
	{
		// Health check (public)
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "Resource Management API is running (Secure)",
				"version": "1.0.0-secure",
			})
		})

		// Public authentication routes
		auth := api.Group("/auth")
		{
			auth.POST("/login", authHandler.Login)
			auth.POST("/register", authHandler.Register)
			auth.GET("/google/login", authHandler.GoogleLogin)
			auth.GET("/google/callback", authHandler.GoogleCallback)
			auth.GET("/microsoft/login", authHandler.MicrosoftLogin)
			auth.GET("/microsoft/callback", authHandler.MicrosoftCallback)
		}

		// Organization registration (public)
		organizations := api.Group("/organizations")
		{
			organizations.POST("", organizationHandler.CreateOrganization)
			organizations.GET("/check-domain", organizationHandler.CheckDomain)
		}

		// Protected routes using secure authentication
		protected := api.Group("")
		protected.Use(middleware.SecureAuthMiddleware())
		{
			// Authentication routes (authenticated)
			authProtected := protected.Group("/auth")
			{
				authProtected.GET("/profile", authHandler.GetProfile)
				authProtected.PUT("/profile", authHandler.UpdateProfile)
				authProtected.POST("/change-password", authHandler.ChangePassword)
				authProtected.POST("/refresh", authHandler.RefreshToken)
				authProtected.POST("/logout", middleware.InvalidateSessionMiddleware())
			}

			// Inspection routes
			inspections := protected.Group("/inspections")
			{
				inspections.GET("", inspectionHandler.GetInspections)
				inspections.POST("", middleware.RequireSecurePermission("can_create_inspections"), inspectionHandler.CreateInspection)
				inspections.GET("/stats", middleware.RequireSecurePermission("can_view_reports"), func(c *gin.Context) {
					statsData, err := inspectionService.GetInspectionStats(c.Request.Context())
					if err != nil {
						c.JSON(500, gin.H{"error": err.Error()})
						return
					}
					c.JSON(200, statsData)
				})
				inspections.GET("/overdue", middleware.RequireSecurePermission("can_view_reports"), func(c *gin.Context) {
					limit := 10
					offset := 0
					overdueInspections, _, err := inspectionService.GetOverdueInspections(c.Request.Context(), limit, offset)
					if err != nil {
						c.JSON(500, gin.H{"error": err.Error()})
						return
					}
					c.JSON(200, gin.H{"inspections": overdueInspections, "total": len(overdueInspections)})
				})

				// Individual inspection routes with resource validation
				inspections.GET("/:id", validateInspectionAccess(orgValidator), inspectionHandler.GetInspection)
				inspections.PUT("/:id", validateInspectionAccess(orgValidator), middleware.RequireSecurePermission("can_edit_inspections"), inspectionHandler.UpdateInspection)
				inspections.DELETE("/:id", validateInspectionAccess(orgValidator), middleware.RequireSecurePermission("can_delete_inspections"), inspectionHandler.DeleteInspection)
				inspections.POST("/:id/submit", validateInspectionAccess(orgValidator), middleware.RequireSecurePermission("can_edit_inspections"), inspectionHandler.SubmitInspection)
				inspections.POST("/:id/assign", middleware.RequireSecureRole("admin", "supervisor"), inspectionHandler.AssignInspection)
				inspections.PUT("/:id/status", validateInspectionAccess(orgValidator), middleware.RequireSecurePermission("can_edit_inspections"), inspectionHandler.UpdateInspectionStatus)

				// Attachment routes for inspections
				inspections.POST("/:id/attachments", validateInspectionAccess(orgValidator), middleware.RequireSecurePermission("can_edit_inspections"), attachmentHandler.UploadFile)
				inspections.GET("/:id/attachments", validateInspectionAccess(orgValidator), attachmentHandler.GetAttachments)
			}

			// Attachment routes
			attachments := protected.Group("/attachments")
			{
				attachments.GET("/:id", attachmentHandler.GetAttachment)
				attachments.GET("/:id/download", attachmentHandler.DownloadFile)
				attachments.DELETE("/:id", middleware.RequireSecurePermission("can_edit_inspections"), attachmentHandler.DeleteAttachment)
			}

			// Template routes
			templates := protected.Group("/templates")
			{
				templates.GET("", templateHandler.GetTemplates)
				templates.POST("", middleware.RequireSecurePermission("can_manage_templates"), templateHandler.CreateTemplate)
				templates.GET("/categories", templateHandler.GetTemplateCategories)
				templates.GET("/:id", validateTemplateAccess(orgValidator), templateHandler.GetTemplate)
				templates.PUT("/:id", validateTemplateAccess(orgValidator), middleware.RequireSecurePermission("can_manage_templates"), templateHandler.UpdateTemplate)
				templates.DELETE("/:id", validateTemplateAccess(orgValidator), middleware.RequireSecurePermission("can_manage_templates"), templateHandler.DeleteTemplate)
				templates.POST("/:id/duplicate", middleware.RequireSecurePermission("can_manage_templates"), templateHandler.DuplicateTemplate)

				// Template versioning routes
				templates.GET("/:id/versions", validateTemplateAccess(orgValidator), templateHandler.GetTemplateVersions)
				templates.GET("/:id/versions/:version", validateTemplateAccess(orgValidator), templateHandler.GetTemplateVersion)
				templates.POST("/:id/versions", validateTemplateAccess(orgValidator), middleware.RequireSecurePermission("can_manage_templates"), templateHandler.CreateTemplateVersion)
			}

			// User management routes (admin/supervisor only)
			users := protected.Group("/users")
			{
				users.GET("", middleware.RequireSecurePermission("can_manage_users"), userHandler.GetUsers)
				users.POST("", middleware.RequireSecurePermission("can_manage_users"), userHandler.CreateUser)
				users.GET("/roles", userHandler.GetUserRoles)
				users.GET("/permissions", userHandler.GetUserPermissions)
				users.GET("/admin-count", middleware.RequireSecurePermission("can_manage_users"), userHandler.GetAdminCount)
				users.GET("/:id", middleware.RequireSecurePermission("can_manage_users"), userHandler.GetUser)
				users.PUT("/:id", middleware.RequireSecurePermission("can_manage_users"), userHandler.UpdateUser)
				users.PUT("/:id/status", middleware.RequireSecurePermission("can_manage_users"), userHandler.ToggleUserStatus)
				users.DELETE("/:id", middleware.RequireSecurePermission("can_manage_users"), userHandler.DeleteUser)
			}

			// Organization management
			orgProtected := protected.Group("/organizations")
			{
				orgProtected.GET("/:id", middleware.RequireSecureRole("admin"), organizationHandler.GetOrganization)
				orgProtected.PUT("/:id", middleware.RequireSecurePermission("can_manage_organization"), organizationHandler.UpdateOrganization)
				orgProtected.POST("/:id/invite", middleware.RequireSecurePermission("can_manage_users"), organizationHandler.InviteUser)
				orgProtected.POST("/seed-templates", middleware.RequireSecurePermission("can_manage_templates"), organizationHandler.SeedTemplates)
				orgProtected.GET("", middleware.RequireSecureRole("admin"), organizationHandler.ListOrganizations) // System admin only
			}

			// Dashboard/Stats routes
			stats := protected.Group("/stats")
			{
				stats.GET("/inspections", middleware.RequireSecurePermission("can_view_reports"), func(c *gin.Context) {
					statsData, err := inspectionService.GetInspectionStats(c.Request.Context())
					if err != nil {
						c.JSON(500, gin.H{"error": err.Error()})
						return
					}
					c.JSON(200, gin.H{"data": statsData})
				})
			}

			// Analytics routes
			analytics := protected.Group("/analytics")
			{
				analytics.GET("/dashboard", middleware.RequireSecurePermission("can_view_reports"), analyticsHandler.GetDashboardStats)
				analytics.GET("/metrics", middleware.RequireSecurePermission("can_view_reports"), analyticsHandler.GetInspectionMetrics)
				analytics.GET("/export/:format", middleware.RequireSecurePermission("can_export_reports"), analyticsHandler.ExportReport)
			}

			// Site routes
			sites := protected.Group("/sites")
			{
				sites.GET("", siteHandler.GetSites)
				sites.POST("", middleware.RequireSecurePermission("can_manage_sites"), siteHandler.CreateSite)
				sites.GET("/active", siteHandler.GetActiveSites) // For dropdowns
				sites.GET("/:id", validateSiteAccess(orgValidator), siteHandler.GetSite)
				sites.PUT("/:id", validateSiteAccess(orgValidator), middleware.RequireSecurePermission("can_manage_sites"), siteHandler.UpdateSite)
				sites.DELETE("/:id", validateSiteAccess(orgValidator), middleware.RequireSecurePermission("can_manage_sites"), siteHandler.DeleteSite)
				sites.GET("/:id/stats", validateSiteAccess(orgValidator), siteHandler.GetSiteStats)
				sites.GET("/:id/inspections", validateSiteAccess(orgValidator), siteHandler.GetSiteInspections)
			}

			// Assignment workflow routes (simplified - no org_id prefix)
			assignments := protected.Group("/assignments")
			{
				assignments.GET("", middleware.RequireSecureRole("admin", "supervisor"), workflowHandler.GetInspectionAssignments)
				assignments.POST("", middleware.RequireSecureRole("admin", "supervisor"), workflowHandler.CreateBulkAssignment)
				assignments.GET("/:id", middleware.RequireSecureRole("admin", "supervisor"), workflowHandler.GetInspectionAssignment)
			}

			// Project workflow routes (simplified - no org_id prefix)
			projects := protected.Group("/projects")
			{
				projects.GET("", middleware.RequireSecureRole("admin", "supervisor"), workflowHandler.GetInspectionProjects)
				projects.POST("", middleware.RequireSecureRole("admin", "supervisor"), workflowHandler.CreateInspectionProject)
				projects.GET("/:id", middleware.RequireSecureRole("admin", "supervisor"), workflowHandler.GetInspectionProject)
			}
		}
	}
}

// validateInspectionAccess ensures user has access to specific inspection
func validateInspectionAccess(validator *services.OrganizationValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		orgID, _ := c.Get("organization_id")
		inspectionID := c.Param("id")

		if err := validator.ValidateResourceAccess(userID.(string), orgID.(string), "inspection", inspectionID); err != nil {
			c.JSON(403, gin.H{
				"error": "Access denied to this inspection",
				"code":  "INSPECTION_ACCESS_DENIED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// validateTemplateAccess ensures user has access to specific template
func validateTemplateAccess(validator *services.OrganizationValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		orgID, _ := c.Get("organization_id")
		templateID := c.Param("id")

		if err := validator.ValidateResourceAccess(userID.(string), orgID.(string), "template", templateID); err != nil {
			c.JSON(403, gin.H{
				"error": "Access denied to this template",
				"code":  "TEMPLATE_ACCESS_DENIED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}

// validateSiteAccess ensures user has access to specific site
func validateSiteAccess(validator *services.OrganizationValidator) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, _ := c.Get("user_id")
		orgID, _ := c.Get("organization_id")
		siteID := c.Param("id")

		if err := validator.ValidateResourceAccess(userID.(string), orgID.(string), "site", siteID); err != nil {
			c.JSON(403, gin.H{
				"error": "Access denied to this site",
				"code":  "SITE_ACCESS_DENIED",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}