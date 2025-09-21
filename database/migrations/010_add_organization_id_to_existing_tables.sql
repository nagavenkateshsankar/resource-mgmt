-- +goose Up
-- +goose StatementBegin

-- Add organization_id to users table
ALTER TABLE users ADD COLUMN organization_id UUID;
ALTER TABLE users ADD COLUMN is_org_admin BOOLEAN DEFAULT false;

-- Add organization_id to templates table
ALTER TABLE templates ADD COLUMN organization_id UUID;

-- Add organization_id to inspections table
ALTER TABLE inspections ADD COLUMN organization_id UUID;

-- Add organization_id to attachments table (for direct organization queries)
ALTER TABLE attachments ADD COLUMN organization_id UUID;

-- Add organization_id to notifications table
ALTER TABLE notifications ADD COLUMN organization_id UUID;

-- Create indexes for efficient tenant isolation
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_templates_organization_id ON templates(organization_id);
CREATE INDEX idx_inspections_organization_id ON inspections(organization_id);
CREATE INDEX idx_attachments_organization_id ON attachments(organization_id);
CREATE INDEX idx_notifications_organization_id ON notifications(organization_id);

-- Create unique constraint for email per organization
CREATE UNIQUE INDEX idx_users_email_organization ON users(email, organization_id) WHERE deleted_at IS NULL;

-- Add foreign key constraints
ALTER TABLE users ADD CONSTRAINT fk_users_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE templates ADD CONSTRAINT fk_templates_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE inspections ADD CONSTRAINT fk_inspections_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE attachments ADD CONSTRAINT fk_attachments_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE notifications ADD CONSTRAINT fk_notifications_organization 
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Remove foreign key constraints
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_organization;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS fk_attachments_organization;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_inspections_organization;
ALTER TABLE templates DROP CONSTRAINT IF EXISTS fk_templates_organization;
ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_organization;

-- Remove indexes
DROP INDEX IF EXISTS idx_users_email_organization;
DROP INDEX IF EXISTS idx_notifications_organization_id;
DROP INDEX IF EXISTS idx_attachments_organization_id;
DROP INDEX IF EXISTS idx_inspections_organization_id;
DROP INDEX IF EXISTS idx_templates_organization_id;
DROP INDEX IF EXISTS idx_users_organization_id;

-- Remove columns
ALTER TABLE notifications DROP COLUMN IF EXISTS organization_id;
ALTER TABLE attachments DROP COLUMN IF EXISTS organization_id;
ALTER TABLE inspections DROP COLUMN IF EXISTS organization_id;
ALTER TABLE templates DROP COLUMN IF EXISTS organization_id;
ALTER TABLE users DROP COLUMN IF EXISTS is_org_admin;
ALTER TABLE users DROP COLUMN IF EXISTS organization_id;

-- +goose StatementEnd