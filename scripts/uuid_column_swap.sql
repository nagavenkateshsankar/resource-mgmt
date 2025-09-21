-- UUID Column Swap Script
-- This swaps the old integer columns with the new UUID columns

-- Drop foreign key constraints first
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_parent_template_id_fkey;
ALTER TABLE templates DROP CONSTRAINT IF EXISTS fk_templates_parent;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_template_id_fkey;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_rails_template;
ALTER TABLE inspection_data DROP CONSTRAINT IF EXISTS inspection_data_inspection_id_fkey;
ALTER TABLE inspection_data DROP CONSTRAINT IF EXISTS fk_rails_inspection;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_inspection_id_fkey;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS fk_rails_inspection_attachment;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_inspection_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_rails_inspection_notification;

-- Drop old columns and rename new ones
-- Templates
ALTER TABLE templates DROP COLUMN id CASCADE;
ALTER TABLE templates DROP COLUMN parent_template_id;
ALTER TABLE templates RENAME COLUMN new_id TO id;
ALTER TABLE templates RENAME COLUMN new_parent_template_id TO parent_template_id;

-- Inspections
ALTER TABLE inspections DROP COLUMN id CASCADE;
ALTER TABLE inspections DROP COLUMN template_id;
ALTER TABLE inspections RENAME COLUMN new_id TO id;
ALTER TABLE inspections RENAME COLUMN new_template_id TO template_id;

-- Inspection_data
ALTER TABLE inspection_data DROP COLUMN id CASCADE;
ALTER TABLE inspection_data DROP COLUMN inspection_id;
ALTER TABLE inspection_data RENAME COLUMN new_id TO id;
ALTER TABLE inspection_data RENAME COLUMN new_inspection_id TO inspection_id;

-- Attachments
ALTER TABLE attachments DROP COLUMN id CASCADE;
ALTER TABLE attachments DROP COLUMN inspection_id;
ALTER TABLE attachments RENAME COLUMN new_id TO id;
ALTER TABLE attachments RENAME COLUMN new_inspection_id TO inspection_id;

-- Notifications
ALTER TABLE notifications DROP COLUMN id CASCADE;
ALTER TABLE notifications DROP COLUMN inspection_id;
ALTER TABLE notifications RENAME COLUMN new_id TO id;
ALTER TABLE notifications RENAME COLUMN new_inspection_id TO inspection_id;

-- Add primary key constraints
ALTER TABLE templates ADD PRIMARY KEY (id);
ALTER TABLE inspections ADD PRIMARY KEY (id);
ALTER TABLE inspection_data ADD PRIMARY KEY (id);
ALTER TABLE attachments ADD PRIMARY KEY (id);
ALTER TABLE notifications ADD PRIMARY KEY (id);

-- Add foreign key constraints back with UUID types
ALTER TABLE templates
    ADD CONSTRAINT templates_parent_template_id_fkey
    FOREIGN KEY (parent_template_id) REFERENCES templates(id) ON DELETE SET NULL;

ALTER TABLE inspections
    ADD CONSTRAINT inspections_template_id_fkey
    FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE RESTRICT;

ALTER TABLE inspection_data
    ADD CONSTRAINT inspection_data_inspection_id_fkey
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE;

ALTER TABLE attachments
    ADD CONSTRAINT attachments_inspection_id_fkey
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE;

ALTER TABLE notifications
    ADD CONSTRAINT notifications_inspection_id_fkey
    FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_parent_template_id ON templates(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_inspections_template_id ON inspections(template_id);
CREATE INDEX IF NOT EXISTS idx_inspection_data_inspection_id ON inspection_data(inspection_id);
CREATE INDEX IF NOT EXISTS idx_attachments_inspection_id ON attachments(inspection_id);
CREATE INDEX IF NOT EXISTS idx_notifications_inspection_id ON notifications(inspection_id);

-- Update created_by column in templates table to handle UUID string
ALTER TABLE templates ALTER COLUMN created_by TYPE VARCHAR(255);

-- Verify the final structure
SELECT 'Migration complete!' as status;
SELECT 'Templates:' as table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'templates' AND column_name IN ('id', 'parent_template_id')
ORDER BY ordinal_position;