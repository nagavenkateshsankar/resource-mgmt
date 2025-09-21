-- +goose Up
-- Add delegated_from column to inspection_assignments table

ALTER TABLE inspection_assignments
ADD COLUMN IF NOT EXISTS delegated_from UUID REFERENCES global_users(id) ON DELETE SET NULL;

-- Create index for delegated_from
CREATE INDEX IF NOT EXISTS idx_inspection_assignments_delegated_from ON inspection_assignments(delegated_from);

-- +goose Down
DROP INDEX IF EXISTS idx_inspection_assignments_delegated_from;
ALTER TABLE inspection_assignments DROP COLUMN IF EXISTS delegated_from;