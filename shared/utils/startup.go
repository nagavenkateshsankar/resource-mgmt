package utils

import (
	"fmt"
	"log"
	"os"
)

// ValidateSecurityConfiguration validates all security-related configuration at startup
func ValidateSecurityConfiguration() error {
	log.Println("🔒 Validating security configuration...")

	// Validate JWT secret
	if err := ValidateJWTSecret(); err != nil {
		return fmt.Errorf("JWT secret validation failed: %w", err)
	}
	log.Println("✅ JWT secret validation passed")

	// Validate other security settings
	if err := validateEnvironmentSecurity(); err != nil {
		return fmt.Errorf("environment security validation failed: %w", err)
	}
	log.Println("✅ Environment security validation passed")

	log.Println("🔒 All security validations passed")
	return nil
}

// validateEnvironmentSecurity checks for common security misconfigurations
func validateEnvironmentSecurity() error {
	// Check for common insecure environment variable values
	insecureValues := map[string][]string{
		"JWT_SECRET": {
			"secret",
			"password",
			"your_jwt_secret_key_here",
			"your-secret-key",
			"jwt-secret",
			"default",
			"changeme",
			"test",
			"dev",
			"development",
		},
		"DB_PASSWORD": {
			"password",
			"admin",
			"root",
			"",
		},
	}

	for envVar, dangerousValues := range insecureValues {
		value := os.Getenv(envVar)
		if value != "" {
			for _, dangerous := range dangerousValues {
				if value == dangerous {
					return fmt.Errorf("environment variable %s contains an insecure default value", envVar)
				}
			}
		}
	}

	// Check for production environment specific requirements
	if os.Getenv("GIN_MODE") == "release" || os.Getenv("APP_ENV") == "production" {
		if err := validateProductionSecurity(); err != nil {
			return fmt.Errorf("production security validation failed: %w", err)
		}
	}

	return nil
}

// validateProductionSecurity validates production-specific security requirements
func validateProductionSecurity() error {
	requiredVars := []string{
		"JWT_SECRET",
		"DB_PASSWORD",
	}

	for _, envVar := range requiredVars {
		if os.Getenv(envVar) == "" {
			return fmt.Errorf("required environment variable %s is not set for production", envVar)
		}
	}

	// Ensure JWT secret is sufficiently long for production
	jwtSecret := os.Getenv("JWT_SECRET")
	if len(jwtSecret) < RecommendedSecretLength {
		return fmt.Errorf("JWT secret should be at least %d characters for production (current: %d)",
			RecommendedSecretLength, len(jwtSecret))
	}

	return nil
}

// MustValidateSecurityConfiguration validates security configuration and panics on failure
// Should be called during application startup
func MustValidateSecurityConfiguration() {
	if err := ValidateSecurityConfiguration(); err != nil {
		log.Fatalf("❌ Security configuration validation failed: %v", err)
	}
}