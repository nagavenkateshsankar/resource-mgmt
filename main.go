package main

import (
	"log"
	"resource-mgmt/config"
	"resource-mgmt/pkg/utils"
	"resource-mgmt/routes"
	"resource-mgmt/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .env file not found")
	}

	// CRITICAL: Validate security configuration before starting
	utils.MustValidateSecurityConfiguration()

	config.ConnectDatabase()
	config.MigrateDatabase()

	// Initialize default templates
	seeder := services.NewTemplateSeeder(config.DB)
	if err := seeder.SeedDefaultTemplates(); err != nil {
		log.Printf("Warning: Failed to seed default templates: %v", err)
	}

	r := gin.Default()

	// Setup CORS middleware for Vue.js development
	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		if origin == "http://localhost:5173" || origin == "http://127.0.0.1:5173" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else {
			c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		}
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Setup secure API routes
	routes.SetupSecureRoutes(r)

	port := "3007"
	log.Printf("🚀 Secure server starting on port %s", port)
	log.Printf("✅ All security validations passed - server is ready")
	r.Run(":" + port)
}