-- +goose Up
-- Create global users table for multi-organization support
CREATE TABLE IF NOT EXISTS global_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    email_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    last_login_at TIMESTAMP,
    preferences JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create organization memberships table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    organization_id UUID NOT NULL,
    role VARCHAR(100) DEFAULT 'inspector',
    permissions JSONB DEFAULT '{}',
    is_org_admin BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false, -- Primary organization for the user
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    invited_by UUID,
    status VARCHAR(50) DEFAULT 'active', -- active, pending, suspended, inactive
    last_accessed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_member_user FOREIGN KEY (user_id)
        REFERENCES global_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_organization FOREIGN KEY (organization_id)
        REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_member_invited_by FOREIGN KEY (invited_by)
        REFERENCES global_users(id) ON DELETE SET NULL,
    CONSTRAINT unique_user_org UNIQUE(user_id, organization_id)
);

-- Create organization invitations table
CREATE TABLE IF NOT EXISTS organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    organization_id UUID NOT NULL,
    invited_by UUID NOT NULL,
    role VARCHAR(100) DEFAULT 'inspector',
    permissions JSONB DEFAULT '{}',
    token VARCHAR(255) UNIQUE NOT NULL,
    message TEXT,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    accepted_by UUID,
    rejected_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_invitation_organization FOREIGN KEY (organization_id)
        REFERENCES organizations(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_invited_by FOREIGN KEY (invited_by)
        REFERENCES global_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_accepted_by FOREIGN KEY (accepted_by)
        REFERENCES global_users(id) ON DELETE SET NULL
);

-- Create user sessions table for managing multiple organization contexts
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    current_organization_id UUID,
    token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_session_user FOREIGN KEY (user_id)
        REFERENCES global_users(id) ON DELETE CASCADE,
    CONSTRAINT fk_session_organization FOREIGN KEY (current_organization_id)
        REFERENCES organizations(id) ON DELETE SET NULL
);

-- Migrate existing users to the new schema
-- Step 1: Copy unique users to global_users
INSERT INTO global_users (id, email, name, password, created_at, updated_at, deleted_at)
SELECT
    gen_random_uuid() as id,
    email,
    name,
    password,
    MIN(created_at) as created_at,
    MAX(updated_at) as updated_at,
    MIN(deleted_at) as deleted_at
FROM users
GROUP BY email, name, password;

-- Step 2: Create organization memberships for existing users
INSERT INTO organization_members (
    user_id,
    organization_id,
    role,
    permissions,
    is_org_admin,
    joined_at,
    status
)
SELECT
    gu.id as user_id,
    u.organization_id,
    u.role,
    u.permissions,
    u.is_org_admin,
    u.created_at as joined_at,
    'active' as status
FROM users u
JOIN global_users gu ON u.email = gu.email;

-- Step 3: Add a temporary column to track migration
ALTER TABLE users ADD COLUMN IF NOT EXISTS migrated_to_global_id UUID;

-- Step 4: Update the reference
UPDATE users u
SET migrated_to_global_id = gu.id
FROM global_users gu
WHERE u.email = gu.email;

-- Create indexes for performance
CREATE INDEX idx_global_users_email ON global_users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_global_users_deleted_at ON global_users(deleted_at);
CREATE INDEX idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX idx_org_members_status ON organization_members(status);
CREATE INDEX idx_invitations_email ON organization_invitations(email);
CREATE INDEX idx_invitations_token ON organization_invitations(token);
CREATE INDEX idx_invitations_expires ON organization_invitations(expires_at);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);

-- Add new columns to organizations table for better multi-org support
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS primary_color VARCHAR(7);

-- Generate slugs for existing organizations
UPDATE organizations
SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '.', ''))
WHERE slug IS NULL;

-- +goose Down
-- Remove new columns from organizations
ALTER TABLE organizations DROP COLUMN IF EXISTS slug;
ALTER TABLE organizations DROP COLUMN IF EXISTS logo_url;
ALTER TABLE organizations DROP COLUMN IF EXISTS primary_color;

-- Remove the migration tracking column
ALTER TABLE users DROP COLUMN IF EXISTS migrated_to_global_id;

-- Drop all new tables
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS organization_invitations;
DROP TABLE IF EXISTS organization_members;
DROP TABLE IF EXISTS global_users;