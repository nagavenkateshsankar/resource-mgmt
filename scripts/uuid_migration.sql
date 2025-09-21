-- UUID Migration Script
-- Run this manually to convert integer IDs to UUIDs

-- Part 1: Add UUID columns (if not exist)
ALTER TABLE templates ADD COLUMN IF NOT EXISTS new_id UUID;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS new_parent_template_id UUID;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS new_id UUID;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS new_template_id UUID;
ALTER TABLE inspection_data ADD COLUMN IF NOT EXISTS new_id UUID;
ALTER TABLE inspection_data ADD COLUMN IF NOT EXISTS new_inspection_id UUID;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS new_id UUID;
ALTER TABLE attachments ADD COLUMN IF NOT EXISTS new_inspection_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS new_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS new_inspection_id UUID;

-- Part 2: Generate UUIDs for existing records
UPDATE templates SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE inspections SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE inspection_data SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE attachments SET new_id = gen_random_uuid() WHERE new_id IS NULL;
UPDATE notifications SET new_id = gen_random_uuid() WHERE new_id IS NULL;

-- Part 3: Update foreign key references
UPDATE templates t1
SET new_parent_template_id = (
    SELECT t2.new_id FROM templates t2 WHERE t2.id = t1.parent_template_id
)
WHERE t1.parent_template_id IS NOT NULL;

UPDATE inspections i
SET new_template_id = (
    SELECT t.new_id FROM templates t WHERE t.id = i.template_id
);

UPDATE inspection_data d
SET new_inspection_id = (
    SELECT i.new_id FROM inspections i WHERE i.id = d.inspection_id
);

UPDATE attachments a
SET new_inspection_id = (
    SELECT i.new_id FROM inspections i WHERE i.id = a.inspection_id
);

UPDATE notifications n
SET new_inspection_id = (
    SELECT i.new_id FROM inspections i WHERE i.id = n.inspection_id
)
WHERE n.inspection_id IS NOT NULL;

-- Part 4: Verify the migration worked
SELECT 'Templates with new UUIDs:' as info, COUNT(*) as total, COUNT(new_id) as with_uuid FROM templates;
SELECT 'Inspections with new UUIDs:' as info, COUNT(*) as total, COUNT(new_id) as with_uuid FROM inspections;
SELECT 'Inspection_data with new UUIDs:' as info, COUNT(*) as total, COUNT(new_id) as with_uuid FROM inspection_data;
SELECT 'Attachments with new UUIDs:' as info, COUNT(*) as total, COUNT(new_id) as with_uuid FROM attachments;
SELECT 'Notifications with new UUIDs:' as info, COUNT(*) as total, COUNT(new_id) as with_uuid FROM notifications;