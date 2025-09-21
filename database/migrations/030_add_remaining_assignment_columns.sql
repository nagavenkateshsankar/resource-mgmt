-- +goose Up
-- Add all remaining missing columns to inspection_assignments table

-- Timeline columns
ALTER TABLE inspection_assignments
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 4;

-- Tracking columns
ALTER TABLE inspection_assignments
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

-- Configuration columns
ALTER TABLE inspection_assignments
ADD COLUMN IF NOT EXISTS requires_acceptance BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS allow_reassignment BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_on_overdue BOOLEAN DEFAULT true;

-- Data column
ALTER TABLE inspection_assignments
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspection_assignments_start_date ON inspection_assignments(start_date);
CREATE INDEX IF NOT EXISTS idx_inspection_assignments_accepted_at ON inspection_assignments(accepted_at);
CREATE INDEX IF NOT EXISTS idx_inspection_assignments_started_at ON inspection_assignments(started_at);
CREATE INDEX IF NOT EXISTS idx_inspection_assignments_completed_at ON inspection_assignments(completed_at);

-- +goose Down
-- Remove indexes
DROP INDEX IF EXISTS idx_inspection_assignments_completed_at;
DROP INDEX IF EXISTS idx_inspection_assignments_started_at;
DROP INDEX IF EXISTS idx_inspection_assignments_accepted_at;
DROP INDEX IF EXISTS idx_inspection_assignments_start_date;

-- Remove columns
ALTER TABLE inspection_assignments
DROP COLUMN IF EXISTS metadata,
DROP COLUMN IF EXISTS notify_on_overdue,
DROP COLUMN IF EXISTS allow_reassignment,
DROP COLUMN IF EXISTS requires_acceptance,
DROP COLUMN IF EXISTS completed_at,
DROP COLUMN IF EXISTS started_at,
DROP COLUMN IF EXISTS accepted_at,
DROP COLUMN IF EXISTS estimated_hours,
DROP COLUMN IF EXISTS start_date;