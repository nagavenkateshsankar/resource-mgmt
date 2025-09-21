-- +goose Up
-- +goose StatementBegin
-- Migration: Add Sites table and update Inspections table
-- Created: 2025-09-18

-- Create Sites table
CREATE TABLE IF NOT EXISTS sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    name VARCHAR(255) NOT NULL,
    address VARCHAR(500) NOT NULL,
    city VARCHAR(100),
    state VARCHAR(100),
    zip_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    latitude FLOAT,
    longitude FLOAT,
    type VARCHAR(50), -- office, warehouse, construction, facility, etc.
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, maintenance
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    notes TEXT,
    created_by INT8 REFERENCES users(id),
    updated_by INT8 REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Add indexes for Sites table
CREATE INDEX IF NOT EXISTS idx_sites_organization_id ON sites(organization_id);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_type ON sites(type);
CREATE INDEX IF NOT EXISTS idx_sites_deleted_at ON sites(deleted_at);
CREATE INDEX IF NOT EXISTS idx_sites_name ON sites(name);

-- Add site_id column to inspections table (keeping legacy columns for backward compatibility)
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);
CREATE INDEX IF NOT EXISTS idx_inspections_site_id ON inspections(site_id);

-- Create view for site statistics
CREATE OR REPLACE VIEW site_statistics AS
SELECT
    s.id as site_id,
    s.name as site_name,
    s.organization_id,
    COUNT(i.id) as total_inspections,
    COUNT(CASE WHEN i.status IN ('completed', 'approved') THEN 1 END) as completed_inspections,
    COUNT(CASE WHEN i.status IN ('draft', 'in_progress', 'requires_review') THEN 1 END) as pending_inspections,
    COUNT(CASE WHEN i.due_date < NOW() AND i.status NOT IN ('completed', 'approved') THEN 1 END) as overdue_inspections,
    MAX(i.completed_at) as last_inspection_date,
    MIN(CASE WHEN i.scheduled_for > NOW() THEN i.scheduled_for END) as next_inspection_date
FROM sites s
LEFT JOIN inspections i ON s.id = i.site_id
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.name, s.organization_id;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_sites_updated_at();

-- Insert sample sites for existing organizations (optional)
-- This helps with initial testing and setup
DO $$
DECLARE
    org_id UUID;
    admin_user_id INT8;
BEGIN
    -- Insert sample sites for each organization
    FOR org_id IN SELECT id FROM organizations WHERE deleted_at IS NULL LOOP
        -- Get an admin user for this organization
        SELECT id INTO admin_user_id FROM users WHERE organization_id = org_id AND is_org_admin = true LIMIT 1;

        -- Skip if no admin user found
        IF admin_user_id IS NOT NULL THEN
            -- Insert sample sites only if no sites exist for this organization
            IF NOT EXISTS (SELECT 1 FROM sites WHERE organization_id = org_id) THEN
                INSERT INTO sites (organization_id, name, address, city, state, zip_code, type, status, created_by, updated_by) VALUES
                (org_id, 'Main Office', '123 Business Ave', 'Business City', 'CA', '90210', 'office', 'active', admin_user_id, admin_user_id),
                (org_id, 'Warehouse Facility', '456 Industrial Blvd', 'Industrial City', 'CA', '90211', 'warehouse', 'active', admin_user_id, admin_user_id),
                (org_id, 'Construction Site A', '789 Project St', 'Construction City', 'CA', '90212', 'construction', 'active', admin_user_id, admin_user_id);
            END IF;
        END IF;
    END LOOP;
END $$;

-- Add comment to migration
COMMENT ON TABLE sites IS 'Stores site/location information for inspections and asset management';
COMMENT ON COLUMN inspections.site_id IS 'New foreign key reference to sites table. Legacy site_location and site_name fields preserved for backward compatibility';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Remove site_id column from inspections
ALTER TABLE inspections DROP COLUMN IF EXISTS site_id;

-- Drop views and triggers
DROP VIEW IF EXISTS site_statistics;
DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
DROP FUNCTION IF EXISTS update_sites_updated_at();

-- Drop sites table
DROP TABLE IF EXISTS sites;
-- +goose StatementEnd