# Role-Based Access Control (RBAC) System Documentation

## Overview

This document describes the comprehensive Role-Based Access Control (RBAC) system implemented in the Site Inspection Management application. The system provides both frontend and backend validation to ensure users can only access features appropriate to their role.

## User Roles

The system supports four distinct user roles with different permission levels:

### 1. Admin
- **Full system access**
- Can manage all users, templates, and inspections
- Has complete administrative privileges
- Can view and manage all organizational data

### 2. Supervisor
- **Management-level access**
- Can create and edit templates
- Can view all inspections within organization
- Can manage their own inspections
- Cannot manage users

### 3. Inspector
- **Field-level access**
- Can create and edit their own inspections
- Can view templates (read-only)
- Cannot create or edit templates
- Cannot view other users' inspections

### 4. Viewer
- **Read-only access**
- Can view templates and their own inspections
- Cannot create, edit, or delete any content
- Minimal permissions for viewing purposes only

## Permission Matrix

| Feature | Admin | Supervisor | Inspector | Viewer |
|---------|--------|------------|-----------|--------|
| **Dashboard Access** | ✅ | ✅ | ✅ | ✅ |
| **Templates** | | | | |
| - View Templates | ✅ | ✅ | ✅ | ✅ |
| - Create Templates | ✅ | ✅ | ❌ | ❌ |
| - Edit Templates | ✅ | ✅ | ❌ | ❌ |
| - Delete Templates | ✅ | ❌ | ❌ | ❌ |
| **Inspections** | | | | |
| - View Own Inspections | ✅ | ✅ | ✅ | ✅ |
| - View All Inspections | ✅ | ✅ | ❌ | ❌ |
| - Create Inspections | ✅ | ✅ | ✅ | ❌ |
| - Edit Inspections | ✅ | ✅ | ✅ | ❌ |
| - Delete Inspections | ✅ | ❌ | ❌ | ❌ |
| **User Management** | | | | |
| - View Users | ✅ | ❌ | ❌ | ❌ |
| - Manage Users | ✅ | ❌ | ❌ | ❌ |
| **Reports** | | | | |
| - View Reports | ✅ | ✅ | ❌ | ❌ |
| - Export Reports | ✅ | ✅ | ❌ | ❌ |
| **File Management** | | | | |
| - Upload Files | ✅ | ✅ | ✅ | ❌ |

## Backend Implementation

### Authentication Middleware (`middleware/auth.go`)

#### Development Tokens
For testing and development purposes, the following tokens are available:

```go
// Admin access tokens
"admin-token" or "dev-token"
- Role: admin
- User ID: 1101148598645817345
- Email: admin@example.com

// Supervisor access token
"supervisor-token"
- Role: supervisor
- User ID: 4101148598645817345
- Email: supervisor@example.com

// Inspector access token
"inspector-token"
- Role: inspector
- User ID: 2101148598645817345
- Email: inspector@example.com

// Viewer access token
"viewer-token"
- Role: viewer
- User ID: 3101148598645817345
- Email: viewer@example.com
```

#### Permission Checks
The middleware provides three types of access control:

1. **Role-based access (`RequireRole`)**:
   ```go
   // Admin can access everything
   users.GET("/", middleware.RequireRole("admin"), userHandler.GetUsers)
   ```

2. **Permission-based access (`RequirePermission`)**:
   ```go
   // Check specific permission
   templates.POST("/", middleware.RequirePermission("can_create_templates"), templateHandler.CreateTemplate)
   ```

3. **Strict role check (`RequireRoleStrict`)**:
   ```go
   // Admin privilege doesn't bypass this check
   someRoute.GET("/", middleware.RequireRoleStrict("specific_role"), handler)
   ```

### API Endpoint Protection (`routes/routes.go`)

#### Protected Endpoints

**User Management (Admin Only)**:
```go
users.GET("/", middleware.RequirePermission("can_manage_users"), userHandler.GetUsers)
users.POST("/", middleware.RequirePermission("can_manage_users"), userHandler.CreateUser)
users.PUT("/:id", middleware.RequirePermission("can_manage_users"), userHandler.UpdateUser)
users.DELETE("/:id", middleware.RequirePermission("can_manage_users"), userHandler.DeleteUser)
```

**Template Management**:
```go
templates.POST("/", middleware.RequirePermission("can_create_templates"), templateHandler.CreateTemplate)
templates.PUT("/:id", middleware.RequirePermission("can_edit_templates"), templateHandler.UpdateTemplate)
templates.DELETE("/:id", middleware.RequirePermission("can_delete_templates"), templateHandler.DeleteTemplate)
```

**Inspection Management**:
```go
inspections.PUT("/:id", middleware.RequirePermission("can_edit_inspections"), inspectionHandler.UpdateInspection)
inspections.DELETE("/:id", middleware.RequirePermission("can_delete_inspections"), inspectionHandler.DeleteInspection)
```

## Frontend Implementation

### Role-Based Navigation

#### Desktop Navigation (`frontend/src/components/layout/AppHeader.vue`)
Navigation items are dynamically generated based on user role:

```typescript
const navigationItems = computed(() => {
  const userRole = authStore.user?.role || 'viewer'

  if (userRole === 'admin') {
    return [
      { name: 'dashboard', path: '/dashboard', label: 'Dashboard' },
      { name: 'inspections', path: '/inspections', label: 'Inspections' },
      { name: 'templates', path: '/templates', label: 'Templates' },
      { name: 'users', path: '/users', label: 'Users' }
    ]
  }
  // ... other roles
})
```

#### Mobile Navigation (`frontend/src/components/layout/AppNavigation.vue`)
Similar role-based logic with mobile-optimized layout.

### Route Guards (`frontend/src/router/index.ts`)

#### Authentication Guard
```typescript
if (to.meta.requiresAuth && !authStore.isAuthenticated) {
  next({ name: 'login', query: { redirect: to.fullPath } })
  return
}
```

#### Role-Based Route Protection
```typescript
if (to.meta.requiresRole && authStore.isAuthenticated) {
  const userRole = authStore.user?.role
  const requiredRoles = Array.isArray(to.meta.requiresRole) ? to.meta.requiresRole : [to.meta.requiresRole]

  if (!userRole || !requiredRoles.includes(userRole)) {
    next({ name: 'dashboard' })
    return
  }
}
```

#### Protected Routes Configuration
```typescript
// Template management routes (admin/supervisor only)
{
  path: '/templates/new',
  name: 'template-new',
  component: () => import('@/views/templates/TemplateCreate.vue'),
  meta: { requiresAuth: true, requiresRole: ['admin', 'supervisor'] }
}

// User management routes (admin only)
{
  path: '/users',
  name: 'users',
  component: () => import('@/views/admin/UsersList.vue'),
  meta: { requiresAuth: true, requiresRole: 'admin' }
}
```

### UI Element Visibility

#### Template Management (`frontend/src/views/templates/TemplatesList.vue`)
```typescript
const canCreateTemplates = computed(() => {
  const userRole = authStore.user?.role
  return userRole === 'admin' || userRole === 'supervisor' || authStore.hasPermission('can_create_templates')
})
```

```vue
<router-link
  v-if="canCreateTemplates"
  to="/templates/new"
  class="btn btn-primary"
>
  New Template
</router-link>
```

## Development and Testing

### Using Development Tokens

To test different role permissions, use the appropriate token in your API requests:

```bash
# Admin access
curl -H "Authorization: Bearer admin-token" http://localhost:3007/api/v1/users

# Inspector access (should be denied)
curl -H "Authorization: Bearer inspector-token" http://localhost:3007/api/v1/users
# Response: {"error":"Permission denied: can_manage_users"}

# Template access (all roles can view)
curl -H "Authorization: Bearer viewer-token" http://localhost:3007/api/v1/templates
```

### Testing Checklist

- [ ] Admin can access all features
- [ ] Supervisor cannot access user management
- [ ] Inspector cannot create templates
- [ ] Viewer cannot create/edit anything
- [ ] Navigation menus show appropriate items for each role
- [ ] Route guards prevent unauthorized access
- [ ] API endpoints return proper error messages for denied access

## Security Considerations

1. **Defense in Depth**: Both frontend and backend validation ensures security even if one layer is bypassed
2. **Token Validation**: All API requests require valid authentication tokens
3. **Permission Granularity**: Fine-grained permissions allow precise access control
4. **Development Tokens**: Only enabled in development environment, should be disabled in production
5. **Role Hierarchy**: Admin role can access everything, other roles have specific limitations

## Error Handling

### Common Error Responses

```json
// Unauthorized access
{"error": "Authorization header required"}

// Invalid token
{"error": "Invalid token"}

// Insufficient permissions
{"error": "Permission denied: can_manage_users"}

// Insufficient role
{"error": "Insufficient role permissions"}
```

## Maintenance

### Adding New Roles
1. Update `Claims` struct permissions in `middleware/auth.go`
2. Add role-specific navigation in frontend components
3. Update route guards in `frontend/src/router/index.ts`
4. Add development token for testing

### Adding New Permissions
1. Define permission in middleware token configurations
2. Add permission checks to relevant API endpoints
3. Update frontend permission checks where needed
4. Update this documentation

## Files Modified/Created

### Backend Files
- `middleware/auth.go` - Authentication and authorization middleware
- `routes/routes.go` - API route protection configuration

### Frontend Files
- `frontend/src/components/layout/AppHeader.vue` - Desktop navigation
- `frontend/src/components/layout/AppNavigation.vue` - Mobile navigation
- `frontend/src/router/index.ts` - Route guards and protection
- `frontend/src/views/templates/TemplatesList.vue` - UI element visibility

### Documentation
- `RBAC_DOCUMENTATION.md` - This comprehensive documentation file

---

**Last Updated**: September 17, 2025
**Version**: 1.0
**Author**: Claude Code Assistant