# Organization Context Strategy

## Current Implementation: Hybrid Approach

We've implemented a **hybrid approach** that supports both token-based and URL-based organization context. This gives you maximum flexibility.

### How It Works

1. **Token Contains Everything**
   - User ID and email
   - All accessible organizations
   - Default/last-used organization ID
   - Roles and permissions per organization

2. **Context Resolution Priority**
   ```
   URL Context → Token Context → Error
   ```

3. **URL Patterns Supported**
   ```
   /api/v1/inspections                    → Uses token's current_org_id
   /api/v1/org/acme-corp/inspections     → Explicit org context
   /api/v1/org/:slug/resource            → URL overrides token
   ```

## Comparison Table

| Aspect | Token-Only | URL-Based | Hybrid (Recommended) |
|--------|------------|-----------|---------------------|
| **Clean URLs** | ✅ Yes | ❌ No | ✅ Optional |
| **Shareable Links** | ❌ No | ✅ Yes | ✅ Yes |
| **Bookmarkable** | ❌ No | ✅ Yes | ✅ Yes |
| **Browser History** | ⚠️ Limited | ✅ Full | ✅ Full |
| **API Simplicity** | ✅ Simple | ⚠️ Complex | ✅ Flexible |
| **Mobile Apps** | ✅ Perfect | ⚠️ Harder | ✅ Perfect |
| **Context Clarity** | ⚠️ Hidden | ✅ Visible | ✅ Visible |
| **Implementation** | ✅ Easy | ⚠️ Medium | ⚠️ Medium |

## Use Cases

### When to Use Token-Only Context
- Mobile applications
- API-only services
- Internal tools
- Simple CRUD operations

### When to Use URL-Based Context
- Multi-tenant SaaS platforms
- Collaborative tools
- Content that needs sharing
- SEO-important pages

### When to Use Hybrid (Our Choice)
- Enterprise applications
- Inspection/audit systems
- Complex workflows
- Mixed mobile/web usage

## API Examples

### 1. Login Response
```json
{
  "token": "eyJhbGc...",
  "user": { ... },
  "organizations": [
    {
      "id": "org1",
      "name": "Acme Corp",
      "slug": "acme-corp",
      "role": "admin"
    },
    {
      "id": "org2",
      "name": "Tech Corp",
      "slug": "tech-corp",
      "role": "inspector"
    }
  ],
  "current_organization": {
    "id": "org1",
    "name": "Acme Corp",
    "slug": "acme-corp"
  }
}
```

### 2. Switching Organizations

#### Option A: Get New Token (Token-Based)
```
POST /api/v1/auth/switch-organization
{
  "organization_id": "org2"
}

Response: New JWT with org2 as current_organization_id
```

#### Option B: Use URL (URL-Based)
```
GET /api/v1/org/tech-corp/inspections
Authorization: Bearer <same-token>

Server validates user has access to tech-corp
```

### 3. Frontend Implementation

```javascript
// Store service
const store = {
  currentOrg: computed(() => {
    // Priority: URL > localStorage > token default
    const urlOrg = route.params.org;
    if (urlOrg) return urlOrg;

    const savedOrg = localStorage.getItem('current_org');
    if (savedOrg) return savedOrg;

    return authStore.defaultOrg;
  })
};

// API service
const api = {
  get: (path) => {
    const org = store.currentOrg;
    const url = org ? `/api/v1/org/${org}${path}` : `/api/v1${path}`;
    return axios.get(url);
  }
};

// Organization switcher component
const switchOrg = (orgSlug) => {
  // Option 1: Update URL
  router.push(`/org/${orgSlug}/dashboard`);

  // Option 2: Update token
  authService.switchOrganization(orgSlug);

  // Option 3: Just update localStorage
  localStorage.setItem('current_org', orgSlug);
  location.reload();
};
```

## Security Considerations

### Token-Based
- ✅ Context validated on every request
- ✅ No URL manipulation attacks
- ⚠️ Token size increases with more orgs

### URL-Based
- ⚠️ Must validate org access on every request
- ⚠️ URL manipulation attempts possible
- ✅ Standard REST patterns

### Hybrid
- ✅ Double validation (token + URL)
- ✅ Fallback mechanisms
- ✅ Best security posture

## Recommendations

### For Your Use Case (Inspection Management)

Given that this is an inspection management system where:
- Users need to share inspection links
- Users work across multiple organizations
- Mobile app support is important
- Audit trails need clear context

**Recommended: Hybrid Approach with URL Priority**

1. **Default Behavior**: Use token context for clean URLs
2. **Sharing/Bookmarking**: Use URL context when needed
3. **Mobile App**: Always use token context
4. **Web App**: Support both patterns

### Implementation Priority

1. **Phase 1**: Token-based context (✅ Already implemented)
2. **Phase 2**: Add URL routing support (✅ Middleware created)
3. **Phase 3**: Frontend org switcher
4. **Phase 4**: Mobile app integration

## Migration Path

Since we've already implemented the token-based approach, you can gradually add URL support:

```javascript
// Start with token-only
/api/v1/inspections

// Add URL support gradually
/api/v1/org/:slug/inspections

// Both work simultaneously
if (request.url.includes('/org/')) {
  context = extractFromURL();
} else {
  context = extractFromToken();
}
```

This gives you the best of both worlds without breaking existing functionality!