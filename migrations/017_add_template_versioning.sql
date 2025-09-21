-- +goose Up
-- +goose StatementBegin
-- Add template versioning support

-- Add version tracking to templates table
ALTER TABLE templates
ADD COLUMN version INT DEFAULT 1,
ADD COLUMN parent_template_id INT8 REFERENCES templates(id),
ADD COLUMN is_latest_version BOOL DEFAULT true,
ADD COLUMN version_notes TEXT,
ADD COLUMN published_at TIMESTAMP DEFAULT NOW();

-- Add template version tracking to inspections
ALTER TABLE inspections
ADD COLUMN template_version INT DEFAULT 1;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_templates_parent_id ON templates(parent_template_id);
CREATE INDEX IF NOT EXISTS idx_templates_version ON templates(version);
CREATE INDEX IF NOT EXISTS idx_templates_is_latest ON templates(is_latest_version);
CREATE INDEX IF NOT EXISTS idx_inspections_template_version ON inspections(template_id, template_version);

-- Update existing templates to version 1
UPDATE templates SET version = 1, is_latest_version = true WHERE version IS NULL;

-- Update existing inspections to use version 1
UPDATE inspections SET template_version = 1 WHERE template_version IS NULL;

-- Create view for template version history
CREATE OR REPLACE VIEW template_version_history AS
SELECT
    t.id,
    t.name,
    t.version,
    t.parent_template_id,
    COALESCE(parent.name, t.name) as base_template_name,
    t.is_latest_version,
    t.version_notes,
    t.published_at,
    t.created_by,
    u.name as created_by_name,
    COUNT(i.id) as inspections_using_version
FROM templates t
LEFT JOIN templates parent ON t.parent_template_id = parent.id
LEFT JOIN users u ON t.created_by = u.id::text
LEFT JOIN inspections i ON t.id = i.template_id AND t.version = i.template_version
WHERE t.deleted_at IS NULL
GROUP BY t.id, t.name, t.version, t.parent_template_id, parent.name,
         t.is_latest_version, t.version_notes, t.published_at, t.created_by, u.name
ORDER BY COALESCE(t.parent_template_id, t.id), t.version DESC;

-- Add comments for documentation
COMMENT ON COLUMN templates.version IS 'Version number for this template, incremented on each update';
COMMENT ON COLUMN templates.parent_template_id IS 'Points to the original template this version is based on';
COMMENT ON COLUMN templates.is_latest_version IS 'True if this is the current active version of the template';
COMMENT ON COLUMN templates.version_notes IS 'Description of changes made in this version';
COMMENT ON COLUMN inspections.template_version IS 'The specific template version used when creating this inspection';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Remove template versioning

-- Drop view
DROP VIEW IF EXISTS template_version_history;

-- Drop indexes
DROP INDEX IF EXISTS idx_templates_parent_id;
DROP INDEX IF EXISTS idx_templates_version;
DROP INDEX IF EXISTS idx_templates_is_latest;
DROP INDEX IF EXISTS idx_inspections_template_version;

-- Remove columns from inspections
ALTER TABLE inspections DROP COLUMN IF EXISTS template_version;

-- Remove columns from templates
ALTER TABLE templates
DROP COLUMN IF EXISTS version,
DROP COLUMN IF EXISTS parent_template_id,
DROP COLUMN IF EXISTS is_latest_version,
DROP COLUMN IF EXISTS version_notes,
DROP COLUMN IF EXISTS published_at;
-- +goose StatementEnd