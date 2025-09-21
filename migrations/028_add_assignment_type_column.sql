-- +goose Up
-- Add assignment_type column to inspection_assignments table

ALTER TABLE inspection_assignments
ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(100) DEFAULT 'manual';

-- Create index for assignment_type
CREATE INDEX IF NOT EXISTS idx_inspection_assignments_assignment_type ON inspection_assignments(assignment_type);

-- +goose Down
DROP INDEX IF EXISTS idx_inspection_assignments_assignment_type;
ALTER TABLE inspection_assignments DROP COLUMN IF EXISTS assignment_type;