# User Management Implementation Guide

## Overview

This guide documents the comprehensive role management system implementation for the multi-organization resource management platform.

## Key Design Decisions

### 1. Role Management Matrix

| Action | Admin → Admin | Admin → Others | Non-Admin → Anyone |
|--------|---------------|-----------------|-------------------|
| View Users | ✅ | ✅ | ❌ |
| Edit Profile | ✅ (self only) | ✅ | ✅ (self only) |
| Change Role | ✅ (if not last admin) | ✅ | ❌ |
| Toggle Status | ❌ (self), ✅ (others if not last) | ✅ | ❌ |
| Delete User | ❌ (self), ✅ (others if not last) | ✅ | ❌ |
| Invite Users | ✅ | ❌ | ❌ |

### 2. Business Rules

#### Critical Security Rules
1. **Last Admin Protection**: Cannot delete, deactivate, or demote the last admin
2. **Self-Management Restrictions**: Users cannot delete/deactivate themselves or change their own role
3. **Organization Isolation**: All actions are scoped to the current organization context
4. **Audit Trail**: All critical actions are logged for security and compliance

#### Role Hierarchy
- **Admin**: Full user management, organization settings
- **Supervisor**: View all inspections, manage templates
- **Inspector**: Create/edit own inspections
- **Viewer**: Read-only access to assigned content

## Implementation Details

### 1. Frontend Components

#### A. UserService (`/frontend/src/services/userService.ts`)
- **Purpose**: Centralized API client with validation logic
- **Key Features**:
  - Client-side validation before API calls
  - Role-based action validation
  - Error handling with user-friendly messages
  - Admin count tracking for last admin protection

#### B. Enhanced UsersList Component (`/frontend/src/views/admin/UsersList.vue`)
- **Purpose**: Secure user management interface
- **Key Features**:
  - Real-time validation of action permissions
  - Contextual tooltips explaining why actions are disabled
  - Confirmation modals for destructive actions
  - Comprehensive error handling

### 2. Backend Services

#### A. Enhanced UserHandler (`/handlers/user_handler.go`)
- **Validation Features**:
  - Self-action prevention
  - Last admin protection
  - Organization context enforcement
  - Comprehensive audit logging

#### B. AuditService (`/services/audit_service.go`)
- **Purpose**: Security audit trail
- **Tracked Events**:
  - User creation/deletion
  - Role changes
  - Status changes
  - Failed permission attempts
  - Login events

### 3. API Endpoints

```
GET    /api/v1/users                 - List users (admin only)
POST   /api/v1/users                 - Create user (admin only)
GET    /api/v1/users/admin-count     - Get admin count (admin only)
GET    /api/v1/users/roles           - Get available roles
PUT    /api/v1/users/:id             - Update user (admin only)
PUT    /api/v1/users/:id/status      - Toggle user status (admin only)
DELETE /api/v1/users/:id             - Delete user (admin only)
```

## Security Features

### 1. Multi-Layer Validation
- **Frontend**: Immediate feedback and UX protection
- **Backend**: Authoritative security enforcement
- **Database**: Constraint-level protection

### 2. Audit Trail
- **All Actions Logged**: Create, update, delete, role changes
- **Security Events**: Failed permissions, login attempts
- **Contextual Data**: IP address, user agent, organization context
- **Immutable Records**: Audit logs cannot be modified

### 3. Error Handling Strategy
- **User-Friendly Messages**: Clear explanations for restrictions
- **Security-First**: No information disclosure in error messages
- **Contextual Help**: Tooltips explaining why actions are disabled

## Business Rule Implementation

### 1. Last Admin Protection
```typescript
// Frontend validation
const isLastAdmin = isTargetAdmin && adminCount <= 1

// Backend validation
if targetUser.Role == "admin" && adminCount <= 1 {
    return error("Cannot remove the last administrator")
}
```

### 2. Self-Management Prevention
```typescript
// Frontend validation
const isSelfAction = currentUser.id === targetUser.id

// Backend validation
if currentUserID.(string) == id {
    return error("Cannot modify your own account")
}
```

### 3. Organization Isolation
```go
// All operations use tenant context
orgID, _ := c.Get("organization_id")
users, err := h.service.GetUsers(ctx, filters, limit, offset)
```

## Error Handling Examples

### 1. Permission Denied
```json
{
  "error": "Only administrators can change user roles",
  "code": "PERMISSION_DENIED",
  "action": "change_role"
}
```

### 2. Last Admin Protection
```json
{
  "error": "Cannot delete the last administrator from the organization",
  "code": "LAST_ADMIN_PROTECTION",
  "suggestion": "Promote another user to admin first"
}
```

### 3. Self-Action Prevention
```json
{
  "error": "Cannot delete your own account",
  "code": "SELF_ACTION_DENIED",
  "suggestion": "Ask another administrator to manage your account"
}
```

## Testing Strategy

### 1. Unit Tests
- [ ] Validation logic in UserService
- [ ] Permission matrix enforcement
- [ ] Last admin protection scenarios
- [ ] Self-action prevention

### 2. Integration Tests
- [ ] End-to-end user management workflows
- [ ] Multi-organization isolation
- [ ] Audit trail verification
- [ ] Error handling paths

### 3. Security Tests
- [ ] Privilege escalation attempts
- [ ] Cross-organization access attempts
- [ ] Audit log integrity
- [ ] Rate limiting and abuse prevention

## Deployment Checklist

### 1. Database Migration
- [ ] Create audit_logs table
- [ ] Update user table constraints
- [ ] Add indexes for performance

### 2. Configuration
- [ ] Update role permissions mapping
- [ ] Configure audit retention policies
- [ ] Set up monitoring for security events

### 3. Validation
- [ ] Test last admin scenarios
- [ ] Verify organization isolation
- [ ] Confirm audit logging works
- [ ] Test error handling paths

## Monitoring & Alerting

### 1. Security Metrics
- Failed permission attempts
- Multiple role change attempts
- Unusual user activity patterns
- Last admin near-misses

### 2. Business Metrics
- User creation/deletion rates
- Role distribution changes
- Admin account management frequency
- Error rates by action type

## Future Enhancements

### 1. Advanced Features
- [ ] Bulk user operations
- [ ] User import/export
- [ ] Advanced role permissions
- [ ] Temporary role assignments

### 2. Security Enhancements
- [ ] Multi-factor authentication
- [ ] Session management
- [ ] Advanced audit analytics
- [ ] Automated security alerts

This implementation provides a robust, secure, and user-friendly role management system that balances security requirements with operational needs.