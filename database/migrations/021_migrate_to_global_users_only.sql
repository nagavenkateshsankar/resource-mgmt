-- +goose Up
-- Migration to complete the transition from legacy users table to global_users only
-- This migration will update all foreign keys to point to global_users and remove the legacy users table

-- Step 1: Add new UUID columns for global_users references
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS global_inspector_id UUID;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS global_created_by UUID;

-- Step 2: Populate the new columns with global_users IDs using the migration mapping
UPDATE inspections
SET global_inspector_id = u.migrated_to_global_id
FROM users u
WHERE inspections.inspector_id = u.id;

UPDATE templates
SET global_created_by = u.migrated_to_global_id
FROM users u
WHERE templates.created_by = u.id;

-- Step 3: Drop the old foreign key constraints
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_inspector_id_fkey;
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_created_by_fkey;

-- Step 4: Drop the old columns
ALTER TABLE inspections DROP COLUMN IF EXISTS inspector_id;
ALTER TABLE templates DROP COLUMN IF EXISTS created_by;

-- Step 5: Rename the new columns to replace the old ones
ALTER TABLE inspections RENAME COLUMN global_inspector_id TO inspector_id;
ALTER TABLE templates RENAME COLUMN global_created_by TO created_by;

-- Step 6: Add foreign key constraints pointing to global_users
ALTER TABLE inspections
ADD CONSTRAINT inspections_inspector_id_fkey
FOREIGN KEY (inspector_id) REFERENCES global_users(id) ON DELETE CASCADE;

ALTER TABLE templates
ADD CONSTRAINT templates_created_by_fkey
FOREIGN KEY (created_by) REFERENCES global_users(id) ON DELETE SET NULL;

-- Step 7: Update indexes to use the new column types
DROP INDEX IF EXISTS idx_inspections_inspector_id;
DROP INDEX IF EXISTS idx_templates_created_by;

CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_templates_created_by ON templates(created_by);

-- Step 8: Now we can safely drop the legacy users table
-- Remove the migration tracking column first
ALTER TABLE users DROP COLUMN IF EXISTS migrated_to_global_id;
DROP TABLE IF EXISTS users;

-- Step 9: Create any missing indexes on global_users for performance
CREATE INDEX IF NOT EXISTS idx_global_users_email_active ON global_users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_global_users_deleted_at ON global_users(deleted_at);

-- +goose Down
-- Recreate users table (this is a destructive rollback - data will be lost)
CREATE TABLE IF NOT EXISTS users (
    id INT8 PRIMARY KEY DEFAULT unique_rowid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'inspector',
    permissions JSONB DEFAULT '{}',
    is_org_admin BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP,

    CONSTRAINT fk_users_organization FOREIGN KEY (organization_id)
        REFERENCES organizations(id) ON DELETE CASCADE
);

-- Add migration tracking column back
ALTER TABLE users ADD COLUMN migrated_to_global_id UUID;

-- Recreate basic data from global_users and organization_members (lossy conversion)
INSERT INTO users (
    organization_id, name, email, password, role,
    is_org_admin, created_at, updated_at, migrated_to_global_id
)
SELECT
    om.organization_id,
    gu.name,
    gu.email,
    gu.password,
    om.role,
    om.is_org_admin,
    gu.created_at,
    gu.updated_at,
    gu.id
FROM global_users gu
JOIN organization_members om ON gu.id = om.user_id
WHERE om.status = 'active';

-- Drop foreign key constraints from global_users
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_inspector_id_fkey;
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_created_by_fkey;

-- Add old integer columns back
ALTER TABLE inspections ADD COLUMN old_inspector_id INT8;
ALTER TABLE templates ADD COLUMN old_created_by INT8;

-- Populate with users.id values
UPDATE inspections
SET old_inspector_id = u.id
FROM users u
WHERE inspections.inspector_id = u.migrated_to_global_id;

UPDATE templates
SET old_created_by = u.id
FROM users u
WHERE templates.created_by = u.migrated_to_global_id;

-- Drop UUID columns
ALTER TABLE inspections DROP COLUMN inspector_id;
ALTER TABLE templates DROP COLUMN created_by;

-- Rename back
ALTER TABLE inspections RENAME COLUMN old_inspector_id TO inspector_id;
ALTER TABLE templates RENAME COLUMN old_created_by TO created_by;

-- Recreate old foreign keys
ALTER TABLE inspections
ADD CONSTRAINT inspections_inspector_id_fkey
FOREIGN KEY (inspector_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE templates
ADD CONSTRAINT templates_created_by_fkey
FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Recreate old indexes
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_templates_created_by ON templates(created_by);