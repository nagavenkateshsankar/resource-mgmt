package utils

import (
	"crypto/rand"
	"errors"
	"fmt"
	"os"
)

const (
	// MinSecretLength defines the minimum required length for JWT secrets
	MinSecretLength = 32
	// RecommendedSecretLength defines the recommended length for JWT secrets
	RecommendedSecretLength = 64
)

var (
	// ErrMissingJWTSecret is returned when no JWT secret is configured
	ErrMissingJWTSecret = errors.New("JWT_SECRET environment variable is required")
	// ErrWeakJWTSecret is returned when the JWT secret is too short
	ErrWeakJWTSecret = fmt.Errorf("JWT secret must be at least %d characters long", MinSecretLength)
)

// GetJWTSecret retrieves and validates the JWT secret from environment
func GetJWTSecret() ([]byte, error) {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return nil, ErrMissingJWTSecret
	}

	if len(secret) < MinSecretLength {
		return nil, ErrWeakJWTSecret
	}

	return []byte(secret), nil
}

// ValidateJWTSecret validates that the JWT secret meets security requirements
func ValidateJWTSecret() error {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		return ErrMissingJWTSecret
	}

	if len(secret) < MinSecretLength {
		return ErrWeakJWTSecret
	}

	// Check for obvious weak secrets
	weakSecrets := []string{
		"secret",
		"password",
		"your_jwt_secret_key_here",
		"your-secret-key",
		"jwt-secret",
		"default",
		"changeme",
	}

	for _, weak := range weakSecrets {
		if secret == weak {
			return errors.New("JWT secret appears to be a default/weak value - please use a cryptographically secure random string")
		}
	}

	return nil
}

// GenerateSecureSecret generates a cryptographically secure random secret
func GenerateSecureSecret(length int) (string, error) {
	if length < MinSecretLength {
		length = RecommendedSecretLength
	}

	bytes := make([]byte, length)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("failed to generate secure secret: %w", err)
	}

	// Convert to base64 for safe storage
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
	result := make([]byte, length)
	for i := 0; i < length; i++ {
		result[i] = charset[int(bytes[i])%len(charset)]
	}

	return string(result), nil
}

// MustGetJWTSecret is a helper that panics if JWT secret is invalid
// Should only be used during application startup
func MustGetJWTSecret() []byte {
	secret, err := GetJWTSecret()
	if err != nil {
		panic(fmt.Sprintf("Invalid JWT configuration: %v", err))
	}
	return secret
}