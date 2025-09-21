-- Create new tables with UUID structure

-- Create new templates table with UUID
CREATE TABLE IF NOT EXISTS templates_uuid (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    fields_schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by VARCHAR(255),
    version INT DEFAULT 1,
    parent_template_id UUID,
    is_latest_version BOOLEAN DEFAULT true,
    version_notes TEXT,
    published_at TIMESTAMP DEFAULT now(),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP
);

-- Create new inspections table with UUID
CREATE TABLE IF NOT EXISTS inspections_uuid (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    template_id UUID NOT NULL,
    template_version INT DEFAULT 1,
    inspector_id VARCHAR(255) NOT NULL,
    assigned_by VARCHAR(255),
    site_id UUID NOT NULL,
    status VARCHAR(50) DEFAULT 'assigned',
    priority VARCHAR(50) DEFAULT 'medium',
    scheduled_for TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP
);

-- Create new inspection_data table with UUID
CREATE TABLE IF NOT EXISTS inspection_data_uuid (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    field_type VARCHAR(100),
    section_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now()
);

-- Create new attachments table with UUID
CREATE TABLE IF NOT EXISTS attachments_uuid (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    inspection_id UUID NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    field_id VARCHAR(255),
    field_name VARCHAR(255),
    storage_url VARCHAR(1000),
    uploaded_at TIMESTAMP DEFAULT now()
);

-- Create new notifications table with UUID
CREATE TABLE IF NOT EXISTS notifications_uuid (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    inspection_id UUID,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT now(),
    deleted_at TIMESTAMP
);

-- Copy data from old tables using the new UUID columns we already generated
INSERT INTO templates_uuid (
    id, organization_id, name, description, category, fields_schema,
    is_active, created_by, version, parent_template_id, is_latest_version,
    version_notes, published_at, created_at, updated_at, deleted_at
)
SELECT
    new_id, organization_id::UUID, name, description, category, fields_schema,
    is_active, created_by::VARCHAR, version, new_parent_template_id, is_latest_version,
    version_notes, published_at, created_at, updated_at, deleted_at
FROM templates;

INSERT INTO inspections_uuid (
    id, organization_id, template_id, template_version, inspector_id,
    assigned_by, site_id, status, priority, scheduled_for, started_at,
    completed_at, due_date, notes, created_at, updated_at, deleted_at
)
SELECT
    new_id, organization_id::UUID, new_template_id, template_version, inspector_id,
    assigned_by, site_id::UUID, status, priority, scheduled_for, started_at,
    completed_at, due_date, notes, created_at, updated_at, deleted_at
FROM inspections;

INSERT INTO inspection_data_uuid (
    id, inspection_id, field_name, field_value, field_type,
    section_name, created_at, updated_at
)
SELECT
    new_id, new_inspection_id, field_name, field_value, field_type,
    section_name, created_at, updated_at
FROM inspection_data;

INSERT INTO attachments_uuid (
    id, organization_id, inspection_id, file_name, file_path,
    file_type, file_size, description, field_id, field_name,
    storage_url, uploaded_at
)
SELECT
    new_id, organization_id::UUID, new_inspection_id, file_name, file_path,
    file_type, file_size, description, field_id, field_name,
    storage_url, uploaded_at
FROM attachments;

-- No notifications to copy since count is 0

-- Add foreign key constraints
ALTER TABLE templates_uuid
    ADD CONSTRAINT templates_uuid_parent_template_id_fkey
    FOREIGN KEY (parent_template_id) REFERENCES templates_uuid(id) ON DELETE SET NULL;

ALTER TABLE inspections_uuid
    ADD CONSTRAINT inspections_uuid_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES templates_uuid(id) ON DELETE RESTRICT;

ALTER TABLE inspection_data_uuid
    ADD CONSTRAINT inspection_data_uuid_inspection_id_fkey
    FOREIGN KEY (inspection_id) REFERENCES inspections_uuid(id) ON DELETE CASCADE;

ALTER TABLE attachments_uuid
    ADD CONSTRAINT attachments_uuid_inspection_id_fkey
    FOREIGN KEY (inspection_id) REFERENCES inspections_uuid(id) ON DELETE CASCADE;

ALTER TABLE notifications_uuid
    ADD CONSTRAINT notifications_uuid_inspection_id_fkey
    FOREIGN KEY (inspection_id) REFERENCES inspections_uuid(id) ON DELETE CASCADE;

-- Create indexes
CREATE INDEX idx_templates_uuid_parent_template_id ON templates_uuid(parent_template_id);
CREATE INDEX idx_templates_uuid_organization_id ON templates_uuid(organization_id);
CREATE INDEX idx_inspections_uuid_template_id ON inspections_uuid(template_id);
CREATE INDEX idx_inspections_uuid_organization_id ON inspections_uuid(organization_id);
CREATE INDEX idx_inspection_data_uuid_inspection_id ON inspection_data_uuid(inspection_id);
CREATE INDEX idx_attachments_uuid_inspection_id ON attachments_uuid(inspection_id);
CREATE INDEX idx_notifications_uuid_inspection_id ON notifications_uuid(inspection_id);

-- Verify data was copied
SELECT 'Templates copied:' as info, COUNT(*) as count FROM templates_uuid;
SELECT 'Inspections copied:' as info, COUNT(*) as count FROM inspections_uuid;
SELECT 'Inspection_data copied:' as info, COUNT(*) as count FROM inspection_data_uuid;
SELECT 'Attachments copied:' as info, COUNT(*) as count FROM attachments_uuid;
SELECT 'Notifications copied:' as info, COUNT(*) as count FROM notifications_uuid;