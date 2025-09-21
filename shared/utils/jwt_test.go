package utils

import (
	"os"
	"strings"
	"testing"
)

func TestGetJWTSecret(t *testing.T) {
	// Store original value to restore later
	originalSecret := os.Getenv("JWT_SECRET")
	defer os.Setenv("JWT_SECRET", originalSecret)

	tests := []struct {
		name        string
		secretValue string
		expectError bool
		errorType   error
	}{
		{
			name:        "Valid long secret",
			secretValue: "this_is_a_very_secure_secret_that_is_definitely_long_enough_for_security",
			expectError: false,
		},
		{
			name:        "Minimum length secret",
			secretValue: strings.Repeat("a", MinSecretLength),
			expectError: false,
		},
		{
			name:        "Empty secret",
			secretValue: "",
			expectError: true,
			errorType:   ErrMissingJWTSecret,
		},
		{
			name:        "Too short secret",
			secretValue: "short",
			expectError: true,
			errorType:   ErrWeakJWTSecret,
		},
		{
			name:        "Just below minimum length",
			secretValue: strings.Repeat("a", MinSecretLength-1),
			expectError: true,
			errorType:   ErrWeakJWTSecret,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("JWT_SECRET", tt.secretValue)

			secret, err := GetJWTSecret()

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none")
					return
				}
				if tt.errorType != nil && err != tt.errorType {
					t.Errorf("Expected error %v, got %v", tt.errorType, err)
				}
				if secret != nil {
					t.Errorf("Expected nil secret on error, got %v", secret)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v", err)
					return
				}
				if string(secret) != tt.secretValue {
					t.Errorf("Expected secret %s, got %s", tt.secretValue, string(secret))
				}
				if len(secret) < MinSecretLength {
					t.Errorf("Secret length %d is below minimum %d", len(secret), MinSecretLength)
				}
			}
		})
	}
}

func TestValidateJWTSecret(t *testing.T) {
	originalSecret := os.Getenv("JWT_SECRET")
	defer os.Setenv("JWT_SECRET", originalSecret)

	tests := []struct {
		name        string
		secretValue string
		expectError bool
		description string
	}{
		{
			name:        "Valid strong secret",
			secretValue: "this_is_a_cryptographically_secure_random_string_with_sufficient_length",
			expectError: false,
			description: "Should accept long, complex secret",
		},
		{
			name:        "Empty secret",
			secretValue: "",
			expectError: true,
			description: "Should reject empty secret",
		},
		{
			name:        "Too short secret",
			secretValue: "short",
			expectError: true,
			description: "Should reject short secret",
		},
		{
			name:        "Weak secret - 'secret'",
			secretValue: "secret",
			expectError: true,
			description: "Should reject 'secret' as weak",
		},
		{
			name:        "Weak secret - 'password'",
			secretValue: "password",
			expectError: true,
			description: "Should reject 'password' as weak",
		},
		{
			name:        "Weak secret - default placeholder",
			secretValue: "your_jwt_secret_key_here",
			expectError: true,
			description: "Should reject default placeholder",
		},
		{
			name:        "Weak secret - changeme",
			secretValue: "changeme",
			expectError: true,
			description: "Should reject 'changeme' pattern",
		},
		{
			name:        "Valid secret with minimum length",
			secretValue: strings.Repeat("x", MinSecretLength),
			expectError: false,
			description: "Should accept minimum length non-weak secret",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			os.Setenv("JWT_SECRET", tt.secretValue)

			err := ValidateJWTSecret()

			if tt.expectError {
				if err == nil {
					t.Errorf("Expected error but got none. %s", tt.description)
				}
			} else {
				if err != nil {
					t.Errorf("Expected no error, got %v. %s", err, tt.description)
				}
			}
		})
	}
}

func TestGenerateSecureSecret(t *testing.T) {
	tests := []struct {
		name           string
		requestedLength int
		expectedMinLength int
		description    string
	}{
		{
			name:            "Default recommended length",
			requestedLength: RecommendedSecretLength,
			expectedMinLength: RecommendedSecretLength,
			description:     "Should generate secret with requested length",
		},
		{
			name:            "Minimum length",
			requestedLength: MinSecretLength,
			expectedMinLength: MinSecretLength,
			description:     "Should generate secret with minimum length",
		},
		{
			name:            "Below minimum - should use recommended",
			requestedLength: 10,
			expectedMinLength: RecommendedSecretLength,
			description:     "Should use recommended length when requested is too small",
		},
		{
			name:            "Large length",
			requestedLength: 128,
			expectedMinLength: 128,
			description:     "Should generate large secret when requested",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			secret, err := GenerateSecureSecret(tt.requestedLength)

			if err != nil {
				t.Errorf("Expected no error, got %v", err)
				return
			}

			if len(secret) < tt.expectedMinLength {
				t.Errorf("Generated secret length %d is less than expected minimum %d. %s",
					len(secret), tt.expectedMinLength, tt.description)
			}

			// Verify secret contains only valid charset characters
			validChars := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
			for _, char := range secret {
				if !strings.ContainsRune(validChars, char) {
					t.Errorf("Generated secret contains invalid character: %c", char)
				}
			}

			// Verify uniqueness by generating multiple secrets
			secret2, err := GenerateSecureSecret(tt.requestedLength)
			if err != nil {
				t.Errorf("Failed to generate second secret: %v", err)
				return
			}

			if secret == secret2 {
				t.Errorf("Generated secrets are identical, randomness may be compromised")
			}
		})
	}
}

func TestMustGetJWTSecret(t *testing.T) {
	originalSecret := os.Getenv("JWT_SECRET")
	defer os.Setenv("JWT_SECRET", originalSecret)

	t.Run("Valid secret should not panic", func(t *testing.T) {
		os.Setenv("JWT_SECRET", strings.Repeat("x", MinSecretLength))

		defer func() {
			if r := recover(); r != nil {
				t.Errorf("MustGetJWTSecret panicked with valid secret: %v", r)
			}
		}()

		secret := MustGetJWTSecret()
		if len(secret) < MinSecretLength {
			t.Errorf("Expected secret length >= %d, got %d", MinSecretLength, len(secret))
		}
	})

	t.Run("Invalid secret should panic", func(t *testing.T) {
		os.Setenv("JWT_SECRET", "short")

		defer func() {
			if r := recover(); r == nil {
				t.Errorf("MustGetJWTSecret should panic with invalid secret")
			}
		}()

		MustGetJWTSecret()
	})

	t.Run("Missing secret should panic", func(t *testing.T) {
		os.Unsetenv("JWT_SECRET")

		defer func() {
			if r := recover(); r == nil {
				t.Errorf("MustGetJWTSecret should panic with missing secret")
			}
		}()

		MustGetJWTSecret()
	})
}

// Benchmark tests for performance validation
func BenchmarkGetJWTSecret(b *testing.B) {
	os.Setenv("JWT_SECRET", strings.Repeat("x", RecommendedSecretLength))

	for i := 0; i < b.N; i++ {
		_, err := GetJWTSecret()
		if err != nil {
			b.Fatalf("GetJWTSecret failed: %v", err)
		}
	}
}

func BenchmarkValidateJWTSecret(b *testing.B) {
	os.Setenv("JWT_SECRET", strings.Repeat("x", RecommendedSecretLength))

	for i := 0; i < b.N; i++ {
		err := ValidateJWTSecret()
		if err != nil {
			b.Fatalf("ValidateJWTSecret failed: %v", err)
		}
	}
}

func BenchmarkGenerateSecureSecret(b *testing.B) {
	for i := 0; i < b.N; i++ {
		_, err := GenerateSecureSecret(RecommendedSecretLength)
		if err != nil {
			b.Fatalf("GenerateSecureSecret failed: %v", err)
		}
	}
}

// Security-focused tests
func TestJWTSecretSecurity(t *testing.T) {
	originalSecret := os.Getenv("JWT_SECRET")
	defer os.Setenv("JWT_SECRET", originalSecret)

	t.Run("Should detect common weak patterns", func(t *testing.T) {
		weakPatterns := []string{
			"secret",
			"password",
			"your_jwt_secret_key_here",
			"your-secret-key",
			"jwt-secret",
			"default",
			"changeme",
		}

		for _, pattern := range weakPatterns {
			// Make it long enough to pass length check but still weak
			weakSecret := pattern + strings.Repeat("x", MinSecretLength)
			os.Setenv("JWT_SECRET", weakSecret)

			err := ValidateJWTSecret()
			if err == nil {
				t.Errorf("Should reject weak pattern: %s", pattern)
			}
		}
	})

	t.Run("Generated secrets should pass validation", func(t *testing.T) {
		secret, err := GenerateSecureSecret(RecommendedSecretLength)
		if err != nil {
			t.Fatalf("Failed to generate secret: %v", err)
		}

		os.Setenv("JWT_SECRET", secret)
		err = ValidateJWTSecret()
		if err != nil {
			t.Errorf("Generated secret failed validation: %v", err)
		}
	})

	t.Run("Secret should not contain predictable patterns", func(t *testing.T) {
		secret, err := GenerateSecureSecret(RecommendedSecretLength)
		if err != nil {
			t.Fatalf("Failed to generate secret: %v", err)
		}

		// Check for obvious patterns
		if strings.Contains(secret, "000000") ||
		   strings.Contains(secret, "111111") ||
		   strings.Contains(secret, "aaaaaa") ||
		   strings.Contains(secret, "AAAAAA") {
			t.Errorf("Generated secret contains predictable patterns: %s", secret[:20])
		}
	})
}