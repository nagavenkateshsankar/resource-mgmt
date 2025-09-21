-- +goose Up
-- +goose StatementBegin

-- Create default organization for existing data
INSERT INTO organizations (id, name, domain, plan, is_active) VALUES 
('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default', 'enterprise', true);

-- Migrate existing data to default organization
UPDATE users SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE templates SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE inspections SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE attachments SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;
UPDATE notifications SET organization_id = '00000000-0000-0000-0000-000000000001' WHERE organization_id IS NULL;

-- Set admin user as organization admin
UPDATE users SET is_org_admin = true WHERE email = 'admin@resourcemgmt.com';

-- Make organization_id NOT NULL after migration
ALTER TABLE users ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE templates ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE inspections ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE attachments ALTER COLUMN organization_id SET NOT NULL;
ALTER TABLE notifications ALTER COLUMN organization_id SET NOT NULL;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin

-- Make columns nullable again
ALTER TABLE notifications ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE attachments ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE inspections ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE templates ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE users ALTER COLUMN organization_id DROP NOT NULL;

-- Reset org admin flag
UPDATE users SET is_org_admin = false WHERE email = 'admin@resourcemgmt.com';

-- Remove organization assignments
UPDATE notifications SET organization_id = NULL;
UPDATE attachments SET organization_id = NULL;
UPDATE inspections SET organization_id = NULL;
UPDATE templates SET organization_id = NULL;
UPDATE users SET organization_id = NULL;

-- Remove default organization
DELETE FROM organizations WHERE id = '00000000-0000-0000-0000-000000000001';

-- +goose StatementEnd