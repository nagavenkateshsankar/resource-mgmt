# Account Switching Approach Analysis

## Option 1: Account-Based (One Account = One Org)

### How It Works
```
john@email.com + Org1 = Account1
john@email.com + Org2 = Account2
john@email.com + Org3 = Account3

User switches between complete accounts, not just organizations.
```

### Implementation

#### Database Schema
```sql
-- Each account is independent
CREATE TABLE user_accounts (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    password VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(100),
    created_at TIMESTAMP,
    last_login TIMESTAMP,
    UNIQUE(email, organization_id)
);

-- Link accounts with same email for easy switching
CREATE TABLE account_links (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    account_ids UUID[] NOT NULL,  -- Array of linked account IDs
    primary_account_id UUID,
    UNIQUE(email)
);

-- Active sessions (can have multiple)
CREATE TABLE account_sessions (
    id UUID PRIMARY KEY,
    account_id UUID NOT NULL,
    token VARCHAR(500) UNIQUE,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT true
);
```

#### Login Flow
```javascript
// 1. User enters email
POST /auth/check-email
{ "email": "john@email.com" }

Response: {
  "accounts": [
    { "id": "acc1", "organization": "Acme Corp", "last_login": "..." },
    { "id": "acc2", "organization": "Tech Inc", "last_login": "..." }
  ]
}

// 2. User selects account and enters password
POST /auth/login
{
  "account_id": "acc1",
  "password": "..."
}

// 3. Get token for that specific account
Response: {
  "token": "...",
  "account": { ... },
  "linked_accounts": [ ... ]  // For switching
}
```

#### Account Switching
```javascript
// Switch to different account (same email)
POST /auth/switch-account
{
  "target_account_id": "acc2",
  "password": "..."  // Optional: require password or use SSO
}

// Returns new token for the other account
```

### Pros ✅
1. **Dead simple** - Each account is isolated
2. **Clear separation** - No confusion about context
3. **Independent passwords** - Can have different passwords per org
4. **Parallel sessions** - Can be logged into multiple accounts
5. **Easy permissions** - Role is tied to account, not complex mapping

### Cons ❌
1. **Account proliferation** - Many accounts for active users
2. **Password fatigue** - Users might need multiple passwords
3. **No single identity** - User data fragmented across accounts
4. **Invitation complexity** - Need to create new account for each invite
5. **Profile updates** - Need to update each account separately

## Option 2: Hybrid Account Switching

### Smart Account Linking
```javascript
// Single password, multiple accounts
{
  "master_email": "john@email.com",
  "master_password": "hashed_password",
  "accounts": [
    { "id": "acc1", "org_id": "org1", "role": "admin" },
    { "id": "acc2", "org_id": "org2", "role": "user" }
  ]
}

// Login once, access all accounts
// Switch without re-authentication
```

## Real-World Examples

### Google's Approach
- Multiple accounts (personal, work, etc.)
- Account switcher in top-right
- Each account = separate session
- Can be logged into all simultaneously

### Microsoft's Approach
- Personal vs Work accounts
- Sometimes same email
- Account switcher
- Single sign-on within account type

### Slack's Approach
- Workspace = Account
- Email can be in multiple workspaces
- Each workspace = separate login
- Desktop app handles multiple sessions

## Recommendation for Your Use Case

### If You Choose Account-Based:

**Best for:**
- Strong isolation requirements
- Different security levels per org
- Simple permission model
- Regulatory compliance needs

**Implementation Steps:**
1. Keep current user table structure
2. Allow duplicate emails (different org_id)
3. Add account linking table
4. Implement account switcher UI
5. Support multiple active sessions

### Modified Schema for Your Approach:
```sql
-- Keep it simple: One user row = one org membership
ALTER TABLE users DROP CONSTRAINT users_email_key;  -- Remove unique email constraint

-- Add unique constraint on (email, organization_id)
ALTER TABLE users ADD CONSTRAINT unique_email_per_org
    UNIQUE(email, organization_id);

-- Track linked accounts
CREATE TABLE user_account_links (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    user_ids UUID[] NOT NULL,
    primary_user_id UUID,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_user_links_email ON user_account_links(email);
```

### API Changes:
```go
// Login returns all accounts for email
func (s *AuthService) Login(email, password string) (*LoginResponse, error) {
    // Find all users with this email
    var users []User
    db.Where("email = ?", email).Find(&users)

    // Verify password (same for all accounts)
    if !verifyPassword(password, users[0].Password) {
        return nil, errors.New("invalid credentials")
    }

    return &LoginResponse{
        Accounts: users,
        DefaultAccountID: users[0].ID,
        Token: generateToken(users[0].ID),
    }, nil
}

// Switch account without password
func (s *AuthService) SwitchAccount(currentUserID, targetAccountID string) (*Token, error) {
    // Verify same email
    var currentUser, targetUser User
    db.First(&currentUser, currentUserID)
    db.First(&targetUser, targetAccountID)

    if currentUser.Email != targetUser.Email {
        return nil, errors.New("cannot switch to different email")
    }

    return generateToken(targetAccountID), nil
}
```

## Final Verdict

### Your Approach (One Email = One Org) Works If:
✅ You want maximum simplicity
✅ Organizations need complete isolation
✅ You don't need complex permission sharing
✅ Users are okay with account switching (like Google)

### Current Approach (One Email = Multiple Orgs) Better If:
✅ You want seamless organization switching
✅ Users collaborate across organizations
✅ You need unified user management
✅ You want single sign-on experience

### My Recommendation:
**Stick with the current multi-org approach** because:
1. It's already implemented
2. More flexible for future growth
3. Better user experience
4. Industry standard for B2B SaaS

But if you prefer simplicity, the account-based approach is totally valid and used by major platforms!