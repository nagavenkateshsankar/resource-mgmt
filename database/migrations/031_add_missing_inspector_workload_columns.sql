-- +goose Up
-- Add missing columns to inspector_workloads table

-- Capacity Configuration columns
ALTER TABLE inspector_workloads
ADD COLUMN IF NOT EXISTS max_concurrent_projects INTEGER DEFAULT 5,
ADD COLUMN IF NOT EXISTS working_hours_per_day INTEGER DEFAULT 8;

-- Current Load columns
ALTER TABLE inspector_workloads
ADD COLUMN IF NOT EXISTS active_projects INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS overdue_inspections INTEGER DEFAULT 0;

-- Availability columns
ALTER TABLE inspector_workloads
ADD COLUMN IF NOT EXISTS available_from TIMESTAMP,
ADD COLUMN IF NOT EXISTS available_until TIMESTAMP;

-- Performance columns
ALTER TABLE inspector_workloads
ADD COLUMN IF NOT EXISTS average_inspection_time INTEGER DEFAULT 240;

-- Preference columns
ALTER TABLE inspector_workloads
ADD COLUMN IF NOT EXISTS max_travel_distance INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS scheduled_time_off JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS preferred_site_types JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS preferred_regions JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS specializations JSONB DEFAULT '[]';

-- Update timestamp column
ALTER TABLE inspector_workloads
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP DEFAULT current_timestamp();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_inspector_workloads_max_concurrent_projects ON inspector_workloads(max_concurrent_projects);
CREATE INDEX IF NOT EXISTS idx_inspector_workloads_available_from ON inspector_workloads(available_from);
CREATE INDEX IF NOT EXISTS idx_inspector_workloads_available_until ON inspector_workloads(available_until);
CREATE INDEX IF NOT EXISTS idx_inspector_workloads_last_updated ON inspector_workloads(last_updated);

-- +goose Down
-- Remove indexes
DROP INDEX IF EXISTS idx_inspector_workloads_last_updated;
DROP INDEX IF EXISTS idx_inspector_workloads_available_until;
DROP INDEX IF EXISTS idx_inspector_workloads_available_from;
DROP INDEX IF EXISTS idx_inspector_workloads_max_concurrent_projects;

-- Remove columns
ALTER TABLE inspector_workloads
DROP COLUMN IF EXISTS last_updated,
DROP COLUMN IF EXISTS specializations,
DROP COLUMN IF EXISTS preferred_regions,
DROP COLUMN IF EXISTS preferred_site_types,
DROP COLUMN IF EXISTS scheduled_time_off,
DROP COLUMN IF EXISTS max_travel_distance,
DROP COLUMN IF EXISTS average_inspection_time,
DROP COLUMN IF EXISTS available_until,
DROP COLUMN IF EXISTS available_from,
DROP COLUMN IF EXISTS overdue_inspections,
DROP COLUMN IF EXISTS active_projects,
DROP COLUMN IF EXISTS working_hours_per_day,
DROP COLUMN IF EXISTS max_concurrent_projects;