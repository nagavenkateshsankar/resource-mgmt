package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type ViewHandler struct{}

type PageData struct {
	Title               string
	Description         string
	BodyClass           string
	StyleSheets         []string
	Scripts             []string
	PreloadScripts      []string
	EnableSW            bool
	LoginMessage        string
	ShowDemoCredentials bool
	User                interface{}
}

func NewViewHandler() *ViewHandler {
	return &ViewHandler{}
}

func (vh *ViewHandler) Home(c *gin.Context) {
	data := PageData{
		Title:       "Dashboard",
		Description: "Mobile inspection app for field workers",
		BodyClass:   "",
		StyleSheets: []string{
			"/static/css/components.css",
			"/static/css/layouts/authenticated.css",
		},
		Scripts: []string{
			// Core utilities and event system (load first)
			"/static/js/utils/EventBus.js",

			// Core classes
			"/static/js/core/state.js",
			"/static/js/core/router.js",

			// Services
			"/static/js/services/APIClient.js",
			"/static/js/services/OfflineManager.js",
			"/static/js/components/NotificationService.js",
			"/static/js/services/FormService.js",
			"/static/js/services/ThemeService.js",
			"/static/js/services/PWAService.js",

			// Icon system (needed by components)
			"/static/js/icons.js",

			// Components
			"/static/js/components/ModalManager.js",
			"/static/js/components/NavigationManager.js",
			"/static/js/components/HeaderManager.js",
			"/static/js/components/DataTableManager.js",
			"/static/js/components/FormManager.js",
			"/static/js/components/TemplateBuilder.js",

			// Authentication (still needed for login functionality)
			"/static/js/auth.js",

			// Main application (MUST BE LAST after all dependencies)
			"/static/js/core/app.js",
		},
		PreloadScripts: []string{
			"/static/js/core/app.js",
			"/static/js/auth.js",
		},
		EnableSW: true,
	}

	c.HTML(http.StatusOK, "authenticated-dashboard", data)
}

func (vh *ViewHandler) Login(c *gin.Context) {
	data := PageData{
		Title:       "Login",
		Description: "Sign in to Site Inspection Manager",
		BodyClass:   "login-page",
		StyleSheets: []string{
			"/static/css/components.css",
			"/static/css/layouts/public.css",
		},
		Scripts: []string{
			"/static/js/auth.js",
		},
		EnableSW:            true,
		LoginMessage:        "Sign in to continue",
		ShowDemoCredentials: true,
	}

	c.HTML(http.StatusOK, "public-login", data)
}

func (vh *ViewHandler) Inspections(c *gin.Context) {
	data := PageData{
		Title:       "Inspections",
		Description: "Manage and track site inspections",
		BodyClass:   "",
		StyleSheets: []string{
			"/static/css/components.css",
			"/static/css/layouts/authenticated.css",
		},
		Scripts: []string{
			// Core utilities and event system (load first)
			"/static/js/utils/EventBus.js",

			// Core classes
			"/static/js/core/state.js",
			"/static/js/core/router.js",

			// Services
			"/static/js/services/APIClient.js",
			"/static/js/services/OfflineManager.js",
			"/static/js/components/NotificationService.js",
			"/static/js/services/FormService.js",
			"/static/js/services/ThemeService.js",
			"/static/js/services/PWAService.js",

			// Icon system (needed by components)
			"/static/js/icons.js",

			// Components
			"/static/js/components/ModalManager.js",
			"/static/js/components/NavigationManager.js",
			"/static/js/components/HeaderManager.js",
			"/static/js/components/DataTableManager.js",
			"/static/js/components/FormManager.js",
			"/static/js/components/TemplateBuilder.js",

			// Authentication (still needed for login functionality)
			"/static/js/auth.js",

			// Main application (MUST BE LAST after all dependencies)
			"/static/js/core/app.js",
		},
		PreloadScripts: []string{
			"/static/js/core/app.js",
		},
		EnableSW: true,
	}

	c.HTML(http.StatusOK, "authenticated-inspections", data)
}

func (vh *ViewHandler) Templates(c *gin.Context) {
	data := PageData{
		Title:       "Templates",
		Description: "Manage inspection templates and forms",
		BodyClass:   "",
		StyleSheets: []string{
			"/static/css/components.css",
			"/static/css/layouts/authenticated.css",
		},
		Scripts: []string{
			// Core utilities and event system (load first)
			"/static/js/utils/EventBus.js",

			// Core classes
			"/static/js/core/state.js",
			"/static/js/core/router.js",

			// Services
			"/static/js/services/APIClient.js",
			"/static/js/services/OfflineManager.js",
			"/static/js/components/NotificationService.js",
			"/static/js/services/FormService.js",
			"/static/js/services/ThemeService.js",
			"/static/js/services/PWAService.js",

			// Icon system (needed by components)
			"/static/js/icons.js",

			// Components
			"/static/js/components/ModalManager.js",
			"/static/js/components/NavigationManager.js",
			"/static/js/components/HeaderManager.js",
			"/static/js/components/DataTableManager.js",
			"/static/js/components/FormManager.js",
			"/static/js/components/TemplateBuilder.js",

			// Authentication (still needed for login functionality)
			"/static/js/auth.js",

			// Main application (MUST BE LAST after all dependencies)
			"/static/js/core/app.js",
		},
		PreloadScripts: []string{
			"/static/js/core/app.js",
			"/static/js/components/TemplateBuilder.js",
		},
		EnableSW: true,
	}

	c.HTML(http.StatusOK, "authenticated-templates", data)
}
