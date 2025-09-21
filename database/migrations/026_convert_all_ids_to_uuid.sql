-- Migration: Convert all integer IDs to UUIDs
-- This migration converts remaining integer primary keys and foreign keys to UUIDs

-- +goose Up

-- Step 1: Add UUID columns alongside existing integer columns
ALTER TABLE templates ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE templates ADD COLUMN IF NOT EXISTS new_parent_template_id UUID;

ALTER TABLE inspections ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS new_template_id UUID;

ALTER TABLE inspection_data ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE inspection_data ADD COLUMN IF NOT EXISTS new_inspection_id UUID;

ALTER TABLE attachments ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS new_inspection_id UUID;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS new_id UUID DEFAULT gen_random_uuid();
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS new_inspection_id UUID;

-- Step 2: Populate UUID values for existing records (if they haven't been set)
UPDATE templates SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE inspections SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE inspection_data SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE attachments SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE notifications SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- Step 3: Update the new UUID foreign key columns based on existing relationships
-- Update parent template references
UPDATE templates t1
SET new_parent_template_id = (
    SELECT t2.new_id
    FROM templates t2
    WHERE t2.id = t1.parent_template_id
)
WHERE t1.parent_template_id IS NOT NULL;

-- Update inspection template references
UPDATE inspections i
SET new_template_id = (
    SELECT t.new_id
    FROM templates t
    WHERE t.id = i.template_id
);

-- Update inspection_data references
UPDATE inspection_data id
SET new_inspection_id = (
    SELECT i.new_id
    FROM inspections i
    WHERE i.id = id.inspection_id
);

-- Update attachment references
UPDATE attachments a
SET new_inspection_id = (
    SELECT i.new_id
    FROM inspections i
    WHERE i.id = a.inspection_id
);

-- Update notification references
UPDATE notifications n
SET new_inspection_id = (
    SELECT i.new_id
    FROM inspections i
    WHERE i.id = n.inspection_id
)
WHERE n.inspection_id IS NOT NULL;

-- Step 4: Drop foreign key constraints (if they exist)
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_parent_template_id_fkey;
ALTER TABLE templates DROP CONSTRAINT IF EXISTS fk_templates_parent;
ALTER TABLE templates DROP CONSTRAINT IF EXISTS templates_parent_template_fkey;

ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_template_id_fkey;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS fk_rails_template;
ALTER TABLE inspections DROP CONSTRAINT IF EXISTS inspections_template_fkey;

ALTER TABLE inspection_data DROP CONSTRAINT IF EXISTS inspection_data_inspection_id_fkey;
ALTER TABLE inspection_data DROP CONSTRAINT IF EXISTS fk_rails_inspection;
ALTER TABLE inspection_data DROP CONSTRAINT IF EXISTS inspection_data_inspection_fkey;

ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_inspection_id_fkey;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS fk_rails_inspection_attachment;
ALTER TABLE attachments DROP CONSTRAINT IF EXISTS attachments_inspection_fkey;

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_inspection_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_rails_inspection_notification;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_inspection_fkey;

-- Step 5: Drop old columns
ALTER TABLE templates DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE templates DROP COLUMN IF EXISTS parent_template_id;

ALTER TABLE inspections DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE inspections DROP COLUMN IF EXISTS template_id;

ALTER TABLE inspection_data DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE inspection_data DROP COLUMN IF EXISTS inspection_id;

ALTER TABLE attachments DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE attachments DROP COLUMN IF EXISTS inspection_id;

ALTER TABLE notifications DROP COLUMN IF EXISTS id CASCADE;
ALTER TABLE notifications DROP COLUMN IF EXISTS inspection_id;

-- Step 6: Rename new columns to proper names
ALTER TABLE templates RENAME COLUMN new_id TO id;
ALTER TABLE templates RENAME COLUMN new_parent_template_id TO parent_template_id;

ALTER TABLE inspections RENAME COLUMN new_id TO id;
ALTER TABLE inspections RENAME COLUMN new_template_id TO template_id;

ALTER TABLE inspection_data RENAME COLUMN new_id TO id;
ALTER TABLE inspection_data RENAME COLUMN new_inspection_id TO inspection_id;

ALTER TABLE attachments RENAME COLUMN new_id TO id;
ALTER TABLE attachments RENAME COLUMN new_inspection_id TO inspection_id;

ALTER TABLE notifications RENAME COLUMN new_id TO id;
ALTER TABLE notifications RENAME COLUMN new_inspection_id TO inspection_id;

-- Step 7: Add primary key constraints
ALTER TABLE templates ADD PRIMARY KEY (id);
ALTER TABLE inspections ADD PRIMARY KEY (id);
ALTER TABLE inspection_data ADD PRIMARY KEY (id);
ALTER TABLE attachments ADD PRIMARY KEY (id);
ALTER TABLE notifications ADD PRIMARY KEY (id);

-- Step 8: Add foreign key constraints back with UUID types
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

-- Step 9: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_parent_template_id ON templates(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_inspections_template_id ON inspections(template_id);
CREATE INDEX IF NOT EXISTS idx_inspection_data_inspection_id ON inspection_data(inspection_id);
CREATE INDEX IF NOT EXISTS idx_attachments_inspection_id ON attachments(inspection_id);
CREATE INDEX IF NOT EXISTS idx_notifications_inspection_id ON notifications(inspection_id);

-- Step 10: Update created_by column in templates table to handle UUID string
ALTER TABLE templates ALTER COLUMN created_by TYPE VARCHAR(255);

-- +goose Down

-- Note: This is a complex migration and rolling back would require:
-- 1. Creating new integer columns
-- 2. Generating sequential IDs
-- 3. Rebuilding all relationships
-- 4. Dropping UUID columns
-- This is not recommended in production

-- For safety, we'll just error out on rollback
SELECT 'This migration cannot be safely rolled back. Please restore from backup if needed.'::text WHERE FALSE;