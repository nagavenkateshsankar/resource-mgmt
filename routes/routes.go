package routes

import (
	"resource-mgmt/config"
	"resource-mgmt/handlers"
	"resource-mgmt/middleware"
	"resource-mgmt/pkg/repository"
	"resource-mgmt/services"

	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
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
		// Health check
		api.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{
				"status":  "ok",
				"message": "Resource Management API is running",
				"version": "1.0.0",
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

		// Protected authentication routes
		authProtected := api.Group("/auth")
		authProtected.Use(middleware.AuthMiddleware())
		authProtected.Use(middleware.TenantContextMiddleware())
		{
			authProtected.GET("/profile", authHandler.GetProfile)
			authProtected.PUT("/profile", authHandler.UpdateProfile)
			authProtected.POST("/change-password", authHandler.ChangePassword)
			authProtected.POST("/refresh", authHandler.RefreshToken)
		}

		// Inspection routes (protected)
		inspections := api.Group("/inspections")
		inspections.Use(middleware.AuthMiddleware())
		inspections.Use(middleware.TenantContextMiddleware())
		{
			inspections.GET("", inspectionHandler.GetInspections)
			inspections.POST("", middleware.RequirePermission("can_create_inspections"), inspectionHandler.CreateInspection)
			inspections.GET("/stats", func(c *gin.Context) {
				statsData, err := inspectionService.GetInspectionStats(c.Request.Context())
				if err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}
				c.JSON(200, statsData)
			})
			inspections.GET("/overdue", func(c *gin.Context) {
				limit := 10
				offset := 0
				overdueInspections, _, err := inspectionService.GetOverdueInspections(c.Request.Context(), limit, offset)
				if err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}
				c.JSON(200, gin.H{"inspections": overdueInspections, "total": len(overdueInspections)})
			})
			inspections.GET("/:id", inspectionHandler.GetInspection)
			inspections.PUT("/:id", middleware.RequirePermission("can_edit_inspections"), inspectionHandler.UpdateInspection)
			inspections.DELETE("/:id", middleware.RequirePermission("can_delete_inspections"), inspectionHandler.DeleteInspection)
			inspections.POST("/:id/submit", middleware.RequirePermission("can_edit_inspections"), inspectionHandler.SubmitInspection)
			inspections.POST("/:id/assign", middleware.RequirePermission("can_assign_inspections"), inspectionHandler.AssignInspection)
			inspections.PUT("/:id/status", middleware.RequirePermission("can_edit_inspections"), inspectionHandler.UpdateInspectionStatus)

			// Attachment routes
			inspections.POST("/:id/attachments", middleware.RequirePermission("can_edit_inspections"), attachmentHandler.UploadFile)
			inspections.GET("/:id/attachments", attachmentHandler.GetAttachments)
		}

		// Attachment routes (protected)
		attachments := api.Group("/attachments")
		attachments.Use(middleware.AuthMiddleware())
		attachments.Use(middleware.TenantContextMiddleware())
		{
			attachments.GET("/:id", attachmentHandler.GetAttachment)
			attachments.GET("/:id/download", attachmentHandler.DownloadFile)
			attachments.DELETE("/:id", middleware.RequirePermission("can_edit_inspections"), attachmentHandler.DeleteAttachment)
		}

		// Template routes (protected)
		templates := api.Group("/templates")
		templates.Use(middleware.AuthMiddleware())
		templates.Use(middleware.TenantContextMiddleware())
		{
			templates.GET("", templateHandler.GetTemplates)
			templates.POST("", middleware.RequirePermission("can_create_templates"), templateHandler.CreateTemplate)
			templates.GET("/categories", templateHandler.GetTemplateCategories)
			templates.GET("/:id", templateHandler.GetTemplate)
			templates.PUT("/:id", middleware.RequirePermission("can_edit_templates"), templateHandler.UpdateTemplate)
			templates.DELETE("/:id", middleware.RequirePermission("can_delete_templates"), templateHandler.DeleteTemplate)
			templates.POST("/:id/duplicate", middleware.RequirePermission("can_create_templates"), templateHandler.DuplicateTemplate)

			// Template versioning routes
			templates.GET("/:id/versions", templateHandler.GetTemplateVersions)
			templates.GET("/:id/versions/:version", templateHandler.GetTemplateVersion)
			templates.POST("/:id/versions", middleware.RequirePermission("can_edit_templates"), templateHandler.CreateTemplateVersion)
		}

		// User management routes (admin only)
		users := api.Group("/users")
		users.Use(middleware.AuthMiddleware())
		users.Use(middleware.TenantContextMiddleware())
		{
			users.GET("", middleware.RequirePermission("can_manage_users"), userHandler.GetUsers)
			users.POST("", middleware.RequirePermission("can_manage_users"), userHandler.CreateUser)
			users.GET("/roles", userHandler.GetUserRoles)
			users.GET("/permissions", userHandler.GetUserPermissions)
			users.GET("/admin-count", middleware.RequirePermission("can_manage_users"), userHandler.GetAdminCount)
			users.GET("/:id", middleware.RequirePermission("can_manage_users"), userHandler.GetUser)
			users.PUT("/:id", middleware.RequirePermission("can_manage_users"), userHandler.UpdateUser)
			users.PUT("/:id/status", middleware.RequirePermission("can_manage_users"), userHandler.ToggleUserStatus)
			users.DELETE("/:id", middleware.RequirePermission("can_manage_users"), userHandler.DeleteUser)
		}

		// Organization management (protected)
		orgProtected := api.Group("/organizations")
		orgProtected.Use(middleware.AuthMiddleware())
		orgProtected.Use(middleware.TenantContextMiddleware())
		{
			orgProtected.GET("/:id", organizationHandler.GetOrganization)
			orgProtected.PUT("/:id", middleware.RequirePermission("can_manage_users"), organizationHandler.UpdateOrganization)
			orgProtected.POST("/:id/invite", middleware.RequirePermission("can_manage_users"), organizationHandler.InviteUser)
			orgProtected.POST("/seed-templates", middleware.RequirePermission("can_create_templates"), organizationHandler.SeedTemplates)
			orgProtected.GET("", middleware.RequirePermission("can_manage_users"), organizationHandler.ListOrganizations) // System admin only
		}

		// Dashboard/Stats routes (protected)
		stats := api.Group("/stats")
		stats.Use(middleware.AuthMiddleware())
		stats.Use(middleware.TenantContextMiddleware())
		{
			stats.GET("/inspections", middleware.RequirePermission("can_view_reports"), func(c *gin.Context) {
				statsData, err := inspectionService.GetInspectionStats(c.Request.Context())
				if err != nil {
					c.JSON(500, gin.H{"error": err.Error()})
					return
				}
				c.JSON(200, gin.H{"data": statsData})
			})
		}

		// Analytics routes (protected)
		analytics := api.Group("/analytics")
		analytics.Use(middleware.AuthMiddleware())
		analytics.Use(middleware.TenantContextMiddleware())
		{
			analytics.GET("/dashboard", middleware.RequirePermission("can_view_reports"), analyticsHandler.GetDashboardStats)
			analytics.GET("/metrics", middleware.RequirePermission("can_view_reports"), analyticsHandler.GetInspectionMetrics)
			analytics.GET("/export/:format", middleware.RequirePermission("can_view_reports"), analyticsHandler.ExportReport)
		}

		// Site routes (protected)
		sites := api.Group("/sites")
		sites.Use(middleware.AuthMiddleware())
		sites.Use(middleware.TenantContextMiddleware())
		{
			sites.GET("", siteHandler.GetSites)
			sites.POST("", middleware.RequirePermission("can_manage_sites"), siteHandler.CreateSite)
			sites.GET("/active", siteHandler.GetActiveSites) // For dropdowns
			sites.GET("/:id", siteHandler.GetSite)
			sites.PUT("/:id", middleware.RequirePermission("can_manage_sites"), siteHandler.UpdateSite)
			sites.DELETE("/:id", middleware.RequirePermission("can_manage_sites"), siteHandler.DeleteSite)
			sites.GET("/:id/stats", siteHandler.GetSiteStats)
			sites.GET("/:id/inspections", siteHandler.GetSiteInspections)
		}

		// Workflow management routes (protected with organization context)
		workflow := api.Group("/organizations/:org_id")
		workflow.Use(middleware.AuthMiddleware())
		workflow.Use(middleware.TenantContextMiddleware())
		{
			// Inspection Projects
			workflow.GET("/projects", middleware.RequirePermission("can_view_projects"), workflowHandler.GetInspectionProjects)
			workflow.POST("/projects", middleware.RequirePermission("can_create_projects"), workflowHandler.CreateInspectionProject)
			workflow.GET("/projects/:project_id", middleware.RequirePermission("can_view_projects"), workflowHandler.GetInspectionProject)
			workflow.PUT("/projects/:project_id", middleware.RequirePermission("can_edit_projects"), workflowHandler.UpdateInspectionProject)
			workflow.DELETE("/projects/:project_id", middleware.RequirePermission("can_delete_projects"), workflowHandler.DeleteInspectionProject)
			workflow.GET("/projects/:project_id/progress", middleware.RequirePermission("can_view_projects"), workflowHandler.GetProjectProgress)

			// Inspection Assignments
			workflow.GET("/assignments", middleware.RequirePermission("can_view_assignments"), workflowHandler.GetInspectionAssignments)
			workflow.POST("/assignments/bulk", middleware.RequirePermission("can_assign_inspections"), workflowHandler.CreateBulkAssignment)
			workflow.GET("/assignments/:assignment_id", middleware.RequirePermission("can_view_assignments"), workflowHandler.GetInspectionAssignment)
			workflow.POST("/assignments/:assignment_id/accept", middleware.RequirePermission("can_edit_inspections"), workflowHandler.AcceptAssignment)
			workflow.POST("/assignments/:assignment_id/reject", middleware.RequirePermission("can_edit_inspections"), workflowHandler.RejectAssignment)
			workflow.POST("/assignments/:assignment_id/reassign", middleware.RequirePermission("can_assign_inspections"), workflowHandler.ReassignInspection)

			// Inspection Reviews
			workflow.GET("/reviews", middleware.RequirePermission("can_view_reviews"), workflowHandler.GetInspectionReviews)
			workflow.POST("/reviews", middleware.RequirePermission("can_create_reviews"), workflowHandler.CreateInspectionReview)
			workflow.POST("/reviews/:review_id/submit", middleware.RequirePermission("can_edit_reviews"), workflowHandler.SubmitInspectionReview)

			// Inspector Workloads
			workflow.GET("/workloads", middleware.RequirePermission("can_view_workloads"), workflowHandler.GetInspectorWorkloads)
			workflow.PUT("/workloads/:inspector_id", middleware.RequirePermission("can_manage_workloads"), workflowHandler.UpdateInspectorWorkload)

			// Workflow Analytics
			workflow.GET("/workflow/analytics", middleware.RequirePermission("can_view_reports"), workflowHandler.GetWorkflowAnalytics)

			// Workflow Alerts
			workflow.GET("/workflow/alerts", middleware.RequirePermission("can_view_alerts"), workflowHandler.GetWorkflowAlerts)
			workflow.POST("/workflow/alerts/:alert_id/acknowledge", middleware.RequirePermission("can_edit_alerts"), workflowHandler.AcknowledgeAlert)
			workflow.POST("/workflow/alerts/:alert_id/resolve", middleware.RequirePermission("can_edit_alerts"), workflowHandler.ResolveAlert)
		}
	}
}
