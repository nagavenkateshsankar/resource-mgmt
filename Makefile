# Site Inspection Manager - Makefile
# Enhanced with DeviceLab patterns

.PHONY: help build run test clean dev migrate seed docker

# Default target
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Build
build: ## Build the application
	@echo "🔨 Building application..."
	@go build -o bin/server cmd/server/main.go
	@echo "✅ Build complete"

# Run development server
run: ## Run the development server
	@echo "🚀 Starting development server..."
	@go run cmd/server/main.go

# Run with old main for backward compatibility
run-old: ## Run with old main.go
	@echo "🚀 Starting server (old architecture)..."
	@go run main.go

# Development with auto-reload (requires air)
dev: ## Run development server with auto-reload
	@if command -v air > /dev/null; then \
		echo "🔥 Starting development server with auto-reload..."; \
		air; \
	else \
		echo "⚠️  'air' not found. Install with: go install github.com/cosmtrek/air@latest"; \
		echo "🚀 Starting regular development server..."; \
		make run; \
	fi

# Database operations
migrate: ## Run database migrations
	@echo "🔄 Running database migrations..."
	@go run cmd/migrate/main.go
	@echo "✅ Migrations complete"

migrate-status: ## Check migration status
	@echo "📊 Checking migration status..."
	@go run cmd/migrate/main.go -status

migrate-up: ## Apply all up migrations
	@echo "⬆️  Applying all up migrations..."
	@go run cmd/migrate/main.go -up

migrate-down: ## Apply all down migrations
	@echo "⬇️  Applying all down migrations..."
	@go run cmd/migrate/main.go -down

# Seed database
seed: ## Seed database with default data
	@echo "🌱 Seeding database..."
	@go run cmd/seed/main.go
	@echo "✅ Database seeded"

# Testing
test: ## Run all tests
	@echo "🧪 Running tests..."
	@go test ./...
	@echo "✅ Tests complete"

test-coverage: ## Run tests with coverage
	@echo "🧪 Running tests with coverage..."
	@go test -coverprofile=coverage.out ./...
	@go tool cover -html=coverage.out -o coverage.html
	@echo "✅ Coverage report generated: coverage.html"

test-smoke: ## Run smoke tests with Playwright
	@echo "🚨 Running smoke tests..."
	@npx playwright test --reporter=line
	@echo "✅ Smoke tests complete"

# Linting and formatting
fmt: ## Format Go code
	@echo "🎨 Formatting code..."
	@go fmt ./...
	@echo "✅ Code formatted"

lint: ## Run linter
	@echo "🔍 Running linter..."
	@if command -v golangci-lint > /dev/null; then \
		golangci-lint run; \
	else \
		echo "⚠️  golangci-lint not found. Install from https://golangci-lint.run/"; \
	fi

# Dependencies
deps: ## Download dependencies
	@echo "📦 Downloading dependencies..."
	@go mod download
	@go mod tidy
	@echo "✅ Dependencies updated"

# Clean
clean: ## Clean build artifacts
	@echo "🧹 Cleaning build artifacts..."
	@rm -rf bin/
	@rm -f coverage.out coverage.html
	@rm -rf test-results/
	@rm -rf playwright-report/
	@echo "✅ Clean complete"

# Docker operations
docker-build: ## Build Docker image
	@echo "🐳 Building Docker image..."
	@docker build -t site-inspection-manager .
	@echo "✅ Docker image built"

docker-run: ## Run Docker container
	@echo "🐳 Running Docker container..."
	@docker run -p 8081:8081 --env-file .env site-inspection-manager

docker-dev: ## Run Docker container in development mode
	@echo "🐳 Running Docker container (development)..."
	@docker run -p 8081:8081 -v $(PWD):/app --env-file .env site-inspection-manager

# Frontend operations
frontend-install: ## Install frontend dependencies
	@echo "📦 Installing frontend dependencies..."
	@cd frontend && npm install
	@echo "✅ Frontend dependencies installed"

frontend-dev: ## Start frontend development server
	@echo "🎨 Starting frontend development server..."
	@cd frontend && npm run dev

frontend-build: ## Build frontend for production
	@echo "🏗️  Building frontend for production..."
	@cd frontend && npm run build
	@echo "✅ Frontend build complete"

frontend-test: ## Run frontend tests
	@echo "🧪 Running frontend tests..."
	@cd frontend && npm run test
	@echo "✅ Frontend tests complete"

frontend-e2e: ## Run E2E tests
	@echo "🎭 Running E2E tests..."
	@cd frontend && npx playwright test
	@echo "✅ E2E tests complete"

# Full-stack development
dev-full: ## Start both backend and frontend in development mode
	@echo "🚀 Starting full-stack development environment..."
	@echo "🧹 Cleaning up any existing processes on ports 3007 and 5173..."
	@lsof -ti:3007 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@sleep 2
	@echo "Backend will run on http://localhost:3007"
	@echo "Frontend will run on http://localhost:5173"
	@echo "Press Ctrl+C to stop both servers"
	@trap 'kill %1 %2' INT; \
	(PORT=3007 go run main.go) & \
	(cd frontend && npm run dev) & \
	wait

# Full-stack development with secure auth (recommended)
dev: ## Start both backend and frontend with authentication (default development mode)
	@echo "🔐 Starting full-stack development environment with authentication..."
	@echo "🧹 Cleaning up any existing processes on ports 3007 and 5173..."
	@lsof -ti:3007 | xargs kill -9 2>/dev/null || true
	@lsof -ti:5173 | xargs kill -9 2>/dev/null || true
	@sleep 2
	@echo "Backend will run on http://localhost:3007"
	@echo "Frontend will run on http://localhost:5173"
	@echo "Press Ctrl+C to stop both servers"
	@trap 'kill %1 %2' INT; \
	(export DB_HOST=nagaizingamacbookair.local && export DB_USER=root && export DB_PASSWORD= && export DB_NAME=resourcedb && export DB_PORT=26257 && export JWT_SECRET="test_jwt_secret_for_security_validation_with_sufficient_length_64_chars" && export ENVIRONMENT="test" && PORT=3007 go run main.go) & \
	(cd frontend && npm run dev) & \
	wait

# Full-stack development with secure auth (alias for backwards compatibility)
dev-secure: dev ## Alias for dev command

# PWA operations
pwa-build: ## Build PWA assets
	@echo "📱 Building PWA assets..."
	@cd frontend && npm run build
	@echo "✅ PWA assets built"

pwa-test: ## Test PWA functionality
	@echo "📱 Testing PWA functionality..."
	@cd frontend && npx playwright test tests/pwa.test.js --reporter=line
	@echo "✅ PWA tests complete"

# Production
prod-build: ## Build for production
	@echo "🏭 Building for production..."
	@CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o bin/server cmd/server/main.go
	@echo "✅ Production build complete"

# Health checks
health: ## Check application health
	@echo "🏥 Checking application health..."
	@curl -f http://localhost:8081/health || echo "❌ Health check failed"

# Comprehensive setup
setup: deps frontend-install migrate seed ## Complete project setup
	@echo "🎉 Project setup complete!"

# Quick development start
quick-start: setup dev-full ## Quick start for full-stack development

# Database reset (dangerous)
db-reset: ## Reset database (dangerous - will delete all data)
	@echo "⚠️  This will delete all data! Press Ctrl+C to cancel..."
	@sleep 5
	@echo "🔥 Resetting database..."
	@go run cmd/reset/main.go
	@make migrate
	@make seed
	@echo "✅ Database reset complete"