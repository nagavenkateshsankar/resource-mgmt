-- +goose Up
-- +goose StatementBegin
-- Ensure deleted_at columns exist in all tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_deleted_at ON users(deleted_at);
CREATE INDEX IF NOT EXISTS idx_templates_deleted_at ON templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_inspections_deleted_at ON inspections(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_deleted_at ON notifications(deleted_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Remove indexes
DROP INDEX IF EXISTS idx_notifications_deleted_at;
DROP INDEX IF EXISTS idx_inspections_deleted_at;
DROP INDEX IF EXISTS idx_templates_deleted_at;
DROP INDEX IF EXISTS idx_users_deleted_at;

-- Remove columns (uncomment if you want to actually drop them)
-- ALTER TABLE notifications DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE inspections DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE templates DROP COLUMN IF EXISTS deleted_at;
-- ALTER TABLE users DROP COLUMN IF EXISTS deleted_at;
-- +goose StatementEnd