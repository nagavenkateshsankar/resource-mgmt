-- +goose Up
-- +goose StatementBegin
ALTER TABLE inspections ADD COLUMN assigned_by VARCHAR(50);
CREATE INDEX idx_inspections_assigned_by ON inspections(assigned_by);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_inspections_assigned_by;
ALTER TABLE inspections DROP COLUMN IF EXISTS assigned_by;
-- +goose StatementEnd