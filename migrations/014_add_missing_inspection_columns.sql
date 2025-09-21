-- +goose Up
-- +goose StatementBegin
ALTER TABLE inspections ADD COLUMN scheduled_for TIMESTAMP;
CREATE INDEX idx_inspections_scheduled_for ON inspections(scheduled_for);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_inspections_scheduled_for;
ALTER TABLE inspections DROP COLUMN IF EXISTS scheduled_for;
-- +goose StatementEnd