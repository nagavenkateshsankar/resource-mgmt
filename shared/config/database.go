package config

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// OAuthConfig holds configuration for external authentication providers
type OAuthConfig struct {
	GoogleClientID        string
	GoogleClientSecret    string
	GoogleRedirectURL     string
	MicrosoftClientID     string
	MicrosoftClientSecret string
	MicrosoftRedirectURL  string
}

var DB *gorm.DB

func ConnectDatabase() {
	// Get environment variables
	dbHost := getEnv("DB_HOST", "nagaizingamacbookair.local")
	dbUser := getEnv("DB_USER", "root")
	dbPassword := getEnv("DB_PASSWORD", "")
	dbName := getEnv("DB_NAME", "resourcedb")
	dbPort := getEnv("DB_PORT", "26257")

	// Print connection info (mask password)
	maskedPassword := ""
	if dbPassword != "" {
		maskedPassword = "***"
	}
	log.Printf("Database Connection Info:")
	log.Printf("  Host: %s", dbHost)
	log.Printf("  Port: %s", dbPort)
	log.Printf("  User: %s", dbUser)
	log.Printf("  Password: %s", maskedPassword)
	log.Printf("  Database: %s", dbName)

	dsn := fmt.Sprintf("postgresql://%s@%s:%s/%s?sslmode=disable&application_name=resource-mgmt",
		dbUser, dbHost, dbPort, dbName)

	log.Printf("Attempting to connect to database...")
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger:      logger.Default.LogMode(logger.Info),
		PrepareStmt: true, // Enable prepared statement caching for better performance
	})

	if err != nil {
		log.Printf("ERROR: Failed to connect to database: %v", err)
		log.Printf("Connection string (masked): host=%s user=%s dbname=%s port=%s", dbHost, dbUser, dbName, dbPort)
		log.Println("Running in demo mode without database connection")
		return
	}

	// Test the connection with a simple query
	sqlDB, err := database.DB()
	if err != nil {
		log.Printf("ERROR: Failed to get database instance: %v", err)
		return
	}

	// Test connection
	err = sqlDB.Ping()
	if err != nil {
		log.Printf("ERROR: Database ping failed: %v", err)
		return
	}

	// Set connection pool parameters
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(5 * time.Minute) // 5 minutes

	DB = database
	log.Printf("✅ Connected to database successfully!")
	log.Printf("  Driver: PostgreSQL/CockroachDB")
	log.Printf("  Connection pool: %d max idle, %d max open", 10, 100)

	// Test a simple query to verify everything works and show current database
	var result int
	var currentDB string
	err = DB.Raw("SELECT 1").Scan(&result).Error
	if err != nil {
		log.Printf("WARNING: Test query failed: %v", err)
	} else {
		log.Printf("✅ Database test query successful")
	}

	// Show current database name
	err = DB.Raw("SELECT current_database()").Scan(&currentDB).Error
	if err != nil {
		log.Printf("WARNING: Could not get current database name: %v", err)
	} else {
		log.Printf("🔍 Currently connected to database: '%s'", currentDB)
	}

	// Show a sample of users in this database
	var userCount int64
	err = DB.Raw("SELECT COUNT(*) FROM global_users").Scan(&userCount).Error
	if err != nil {
		log.Printf("WARNING: Could not count global_users: %v", err)
	} else {
		log.Printf("👥 Global user count in current database: %d", userCount)
	}
}

func MigrateDatabase() {
	// Skip GORM AutoMigrate - using goose migrations instead
	log.Println("Skipping AutoMigrate - using goose migrations")
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// OAuth2 Configurations
var (
	GoogleClientID     = os.Getenv("GOOGLE_CLIENT_ID")
	GoogleClientSecret = os.Getenv("GOOGLE_CLIENT_SECRET")
	GoogleRedirectURL  = os.Getenv("GOOGLE_REDIRECT_URL")

	MicrosoftClientID     = os.Getenv("MICROSOFT_CLIENT_ID")
	MicrosoftClientSecret = os.Getenv("MICROSOFT_CLIENT_SECRET")
	MicrosoftRedirectURL  = os.Getenv("MICROSOFT_REDIRECT_URL")
)
