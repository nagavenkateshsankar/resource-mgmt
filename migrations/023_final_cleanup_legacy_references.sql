-- +goose Up
-- Final cleanup migration to ensure all legacy user references are removed
-- This migration is safe to run even if the legacy users table is already gone

-- Since migration 021 already properly handled the foreign key constraints and table cleanup,
-- this migration just ensures any remaining legacy artifacts are cleaned up

-- Step 3: Make sure the legacy users table is completely gone
DROP TABLE IF EXISTS users CASCADE;

-- Step 4: Clean up any remaining indexes that might reference the old users table
DROP INDEX IF EXISTS idx_users_deleted_at;
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_users_role;

-- Step 5: Ensure proper indexes exist on global_users for performance
CREATE INDEX IF NOT EXISTS idx_global_users_email_active ON global_users(email) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_global_users_deleted_at ON global_users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_global_users_created_at ON global_users(created_at);

-- Step 6: Ensure proper indexes exist on organization_members for performance
CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_organization_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_role ON organization_members(role);
CREATE INDEX IF NOT EXISTS idx_organization_members_status ON organization_members(status);

-- +goose Down
-- This is a cleanup migration - rollback would be destructive and is not recommended
-- The rollback would need to recreate the legacy users table structure, which would lose data
SELECT 'Rollback of final cleanup migration is not supported - would be destructive' as warning;