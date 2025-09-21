# Resource Management - Site Inspection System

A digital workflow platform for managing site inspections, similar to DashPivot's functionality.

## Features

- 📋 **Digital Forms**: Create and manage inspection templates
- 📱 **Mobile-First**: Responsive design for field inspections
- 📷 **File Uploads**: Attach photos and documents to inspections
- 📊 **Real-time Dashboard**: Monitor inspection progress
- 🔔 **Notifications**: Real-time updates on inspection status
- 📈 **Reporting**: Export inspection data and reports

## Database Setup

### Using Goose Migrations

1. **Install PostgreSQL** and create database:
   ```bash
   createdb resource_mgmt
   ```

2. **Update .env file** with your database credentials:
   ```
   DB_HOST=nagaizingamacbookair.local
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=resource_mgmt
   DB_PORT=26257
   ```

3. **Run migrations**:
   ```bash
   # Run all pending migrations
   make migrate-up
   
   # Check migration status
   make migrate-status
   
   # Rollback last migration
   make migrate-down
   
   # Reset all migrations
   make migrate-reset
   ```

### Migration Commands

```bash
# Create new migration
make migrate-create

# Run migrations up
make migrate-up

# Rollback migrations
make migrate-down

# Check status
make migrate-status

# Validate migrations
make migrate-validate
```

## Running the Application

```bash
# Install dependencies
make deps

# Run migrations
make migrate-up

# Build and run
make build
make run

# Or run in development mode
go run main.go
```

## API Endpoints

- `GET /health` - Health check endpoint

## Database Schema

### Tables:
- **users** - System users (inspectors, admins)
- **templates** - Inspection form templates with JSON schemas
- **inspections** - Individual inspection records
- **inspection_data** - Form field responses
- **attachments** - File uploads
- **notifications** - Real-time notifications

### Sample Data:
- Default admin user: `admin@resourcemgmt.com`
- Sample inspectors: `john@company.com`, `sarah@company.com`
- Template examples: Safety Inspection, Equipment Inspection

## Development

```bash
# Run tests
make test

# Clean build artifacts
make clean

# Hot reload (requires air)
go install github.com/air-verse/air@latest
make dev
```