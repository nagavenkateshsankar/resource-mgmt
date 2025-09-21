-- Database Cleanup Script
-- This script removes duplicate data before UUID migration

-- Step 1: Check current data counts
SELECT 'Templates before cleanup:' as info, COUNT(*) as count FROM templates;
SELECT 'Inspections before cleanup:' as info, COUNT(*) as count FROM inspections;
SELECT 'Attachments before cleanup:' as info, COUNT(*) as count FROM attachments;
SELECT 'Notifications before cleanup:' as info, COUNT(*) as count FROM notifications;

-- Step 2: Remove duplicate templates, keeping only the first one of each name per organization
DELETE FROM templates
WHERE id NOT IN (
    SELECT MIN(id)
    FROM templates t2
    WHERE templates.name = t2.name
    AND templates.organization_id = t2.organization_id
);

-- Step 3: Remove orphaned inspections (those referencing deleted templates)
DELETE FROM inspections
WHERE template_id NOT IN (SELECT id FROM templates);

-- Step 4: Remove orphaned inspection_data
DELETE FROM inspection_data
WHERE inspection_id NOT IN (SELECT id FROM inspections);

-- Step 5: Remove orphaned attachments
DELETE FROM attachments
WHERE inspection_id NOT IN (SELECT id FROM inspections);

-- Step 6: Remove orphaned notifications
DELETE FROM notifications
WHERE inspection_id IS NOT NULL
AND inspection_id NOT IN (SELECT id FROM inspections);

-- Step 7: Show counts after cleanup
SELECT 'Templates after cleanup:' as info, COUNT(*) as count FROM templates;
SELECT 'Inspections after cleanup:' as info, COUNT(*) as count FROM inspections;
SELECT 'Attachments after cleanup:' as info, COUNT(*) as count FROM attachments;
SELECT 'Notifications after cleanup:' as info, COUNT(*) as count FROM notifications;

-- Step 8: Reset the new_id columns if they exist
UPDATE templates SET new_id = NULL WHERE new_id IS NOT NULL;
UPDATE templates SET new_parent_template_id = NULL WHERE new_parent_template_id IS NOT NULL;