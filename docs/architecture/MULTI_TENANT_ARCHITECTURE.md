# Multi-Tenant Architecture Implementation

## 🏢 Overview

This resource management application implements **enterprise-grade multi-tenant architecture** with complete data isolation between organizations. Every tenant (organization) operates in a completely isolated environment with zero data leakage risk.

## 🔒 Security Model

### Tenant Isolation Layers

1. **Application Layer Isolation**
   - JWT tokens include `organization_id` in claims
   - All API endpoints validate organization context
   - Middleware automatically filters queries by organization

2. **Database Layer Isolation**
   - All data tables include `organization_id` foreign key
   - Database constraints prevent cross-tenant data access
   - Row Level Security (RLS) policies enforce tenant boundaries
   - Unique constraints are scoped per organization

3. **API Layer Isolation**
   - Authentication middleware extracts organization context
   - Tenant context middleware validates organization access
   - All service methods include organization scoping

## 📊 Database Schema

### Core Models with Tenant Isolation

```go
type Organization struct {
    ID        string         `gorm:"primarykey;type:uuid"`
    Name      string         `gorm:"size:255;not null"`
    Domain    string         `gorm:"size:100;unique;not null"`
    Settings  datatypes.JSON `gorm:"type:jsonb"`
    Plan      string         `gorm:"default:'free'"`
    IsActive  bool           `gorm:"default:true"`
    // ... timestamps
}

type User struct {
    ID             string `gorm:"primarykey;type:uuid"`
    OrganizationID string `gorm:"not null;index"` // 🔑 TENANT KEY
    Name           string
    Email          string // Unique per organization only
    Role           string
    // ... other fields
}

type Template struct {
    ID             uint   `gorm:"primarykey"`
    OrganizationID string `gorm:"not null;index"` // 🔑 TENANT KEY
    Name           string
    Description    string
    FieldsSchema   datatypes.JSON
    // ... other fields
}

type Inspection struct {
    ID             uint   `gorm:"primarykey"`
    OrganizationID string `gorm:"not null;index"` // 🔑 TENANT KEY
    TemplateID     uint
    InspectorID    string
    SiteLocation   string
    Status         string
    // ... other fields
}
```

### Database Constraints

```sql
-- Email unique per organization (not globally)
ALTER TABLE users ADD CONSTRAINT users_email_org_unique
    UNIQUE (email, organization_id);

-- All tenant tables have organization_id indexes
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_templates_organization_id ON templates(organization_id);
CREATE INDEX idx_inspections_organization_id ON inspections(organization_id);

-- Row Level Security Policies
CREATE POLICY user_tenant_policy ON users
    FOR ALL USING (organization_id = current_setting('app.current_organization_id', true)::uuid);
```

## 🛡️ Security Implementation

### JWT Claims Structure

```go
type Claims struct {
    UserID         string                 `json:"user_id"`
    OrganizationID string                 `json:"organization_id"` // 🔑 CRITICAL
    Email          string                 `json:"email"`
    Role           string                 `json:"role"`
    Permissions    map[string]interface{} `json:"permissions"`
    jwt.RegisteredClaims
}
```

### Middleware Stack

```go
// Authentication middleware extracts user and organization context
func AuthMiddleware() gin.HandlerFunc {
    // Validates JWT and sets:
    // - c.Set("user_id", claims.UserID)
    // - c.Set("organization_id", claims.OrganizationID) // 🔑 CRITICAL
    // - c.Set("user_email", claims.Email)
    // - c.Set("user_role", claims.Role)
}

// Tenant context middleware ensures organization isolation
func TenantContext() gin.HandlerFunc {
    // Validates organization context exists
    // Sets c.Set("tenant_id", orgID) for services
}
```

### Service Layer Pattern

```go
// Example service method with tenant isolation
func (s *TemplateService) GetTemplates(c *gin.Context, limit, offset int) ([]Template, error) {
    orgID := middleware.GetOrganizationID(c)
    if orgID == "" {
        return nil, errors.New("organization context required")
    }

    var templates []Template
    err := s.db.Where("organization_id = ?", orgID).
        Limit(limit).Offset(offset).
        Find(&templates).Error

    return templates, err
}
```

## 🔧 Usage Guidelines

### For Developers

1. **Always Include Organization Context**
   ```go
   // ✅ CORRECT - Scoped to organization
   db.Where("organization_id = ?", orgID).Find(&records)

   // ❌ WRONG - Global query, security risk
   db.Find(&records)
   ```

2. **Use Helper Functions**
   ```go
   orgID := middleware.GetOrganizationID(c)
   tenantID := middleware.GetTenantID(c)
   ```

3. **Validate Organization Context**
   ```go
   if orgID == "" {
       return c.JSON(http.StatusForbidden, gin.H{"error": "Organization access required"})
   }
   ```

### For API Endpoints

```go
// Apply tenant context middleware to protected routes
api.Use(middleware.AuthMiddleware())
api.Use(middleware.TenantContext())

// All handlers automatically have organization context
func (h *TemplateHandler) GetTemplates(c *gin.Context) {
    // Organization ID is automatically available
    orgID := middleware.GetOrganizationID(c)
    // ... use orgID in all database queries
}
```

## 🧪 Testing Multi-Tenant Isolation

### Unit Tests

```go
func TestTenantIsolation(t *testing.T) {
    // Create two organizations
    org1 := &Organization{ID: "org1", Name: "Company A"}
    org2 := &Organization{ID: "org2", Name: "Company B"}

    // Create users in different organizations
    user1 := &User{OrganizationID: "org1", Email: "user@companya.com"}
    user2 := &User{OrganizationID: "org2", Email: "user@companyb.com"}

    // Test that user1 cannot access user2's data
    // ... test implementation
}
```

### Integration Tests

```bash
# Test with different organization tokens
curl -H "Authorization: Bearer org1_token" /api/templates
curl -H "Authorization: Bearer org2_token" /api/templates

# Should return completely different datasets
```

## 🚨 Security Checklist

- [x] All data models include `organization_id`
- [x] JWT tokens include organization context
- [x] Database unique constraints are org-scoped
- [x] Row Level Security policies are enabled
- [x] Middleware validates organization context
- [x] Service methods include tenant filtering
- [x] API endpoints use tenant middleware
- [x] Email uniqueness is per-organization

## 🔍 Monitoring & Observability

### Key Metrics to Monitor

1. **Tenant Isolation Violations**
   - Cross-organization data access attempts
   - Missing organization context in requests
   - Invalid organization IDs in queries

2. **Performance Metrics**
   - Query performance with organization filtering
   - Index usage on organization_id columns
   - Database connection pools per tenant

### Logging

```go
log.WithFields(log.Fields{
    "user_id": userID,
    "organization_id": orgID,
    "action": "template_access",
}).Info("Tenant operation")
```

## 🔮 Future Enhancements

1. **Database-per-Tenant**: Scale to separate databases per organization
2. **Tenant Metrics**: Per-organization usage and performance analytics
3. **Tenant Administration**: Organization management APIs
4. **Data Migration Tools**: Move tenants between environments
5. **Compliance Tools**: GDPR, SOC2 compliance per tenant

## ⚠️ Critical Security Notes

1. **Never Skip Organization Filtering**: Every database query MUST include organization_id
2. **Validate JWT Organization Context**: Always verify organization context exists
3. **Use Prepared Statements**: Prevent SQL injection with tenant IDs
4. **Audit Trail**: Log all tenant operations for security monitoring
5. **Regular Security Reviews**: Periodically audit tenant isolation

---

**🛡️ This implementation provides enterprise-grade multi-tenant security with complete data isolation between organizations.**