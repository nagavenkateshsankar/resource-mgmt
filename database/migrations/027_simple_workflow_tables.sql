-- +goose Up
-- Create basic workflow tables for site inspection assignment and review

-- 1. Create inspection_projects table
CREATE TABLE IF NOT EXISTS inspection_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    priority VARCHAR(50) DEFAULT 'medium',
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_by UUID NOT NULL REFERENCES global_users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create inspection_assignments table
CREATE TABLE IF NOT EXISTS inspection_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    project_id UUID REFERENCES inspection_projects(id) ON DELETE SET NULL,
    batch_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    priority VARCHAR(50) DEFAULT 'medium',
    assigned_by UUID NOT NULL REFERENCES global_users(id),
    assigned_to UUID NOT NULL REFERENCES global_users(id),
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    site_ids JSONB NOT NULL,
    template_id UUID NOT NULL REFERENCES templates(id),
    instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create inspector_workloads table
CREATE TABLE IF NOT EXISTS inspector_workloads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    inspector_id UUID NOT NULL REFERENCES global_users(id) ON DELETE CASCADE,
    max_daily_inspections INTEGER DEFAULT 8,
    max_weekly_inspections INTEGER DEFAULT 40,
    current_daily_load INTEGER DEFAULT 0,
    current_weekly_load INTEGER DEFAULT 0,
    pending_assignments INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    quality_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(organization_id, inspector_id)
);

-- Add assignment_id column to existing inspections table
ALTER TABLE inspections
ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES inspection_assignments(id) ON DELETE SET NULL;

-- Create indexes
CREATE INDEX idx_inspection_projects_organization_id ON inspection_projects(organization_id);
CREATE INDEX idx_inspection_projects_status ON inspection_projects(status);
CREATE INDEX idx_inspection_assignments_organization_id ON inspection_assignments(organization_id);
CREATE INDEX idx_inspection_assignments_project_id ON inspection_assignments(project_id);
CREATE INDEX idx_inspection_assignments_assigned_to ON inspection_assignments(assigned_to);
CREATE INDEX idx_inspection_assignments_status ON inspection_assignments(status);
CREATE INDEX idx_inspector_workloads_organization_id ON inspector_workloads(organization_id);
CREATE INDEX idx_inspector_workloads_inspector_id ON inspector_workloads(inspector_id);
CREATE INDEX idx_inspections_assignment_id ON inspections(assignment_id);

-- Default workload records will be created by application logic

-- +goose Down
DROP INDEX IF EXISTS idx_inspections_assignment_id;
ALTER TABLE inspections DROP COLUMN IF EXISTS assignment_id;
DROP TABLE IF EXISTS inspector_workloads;
DROP TABLE IF EXISTS inspection_assignments;
DROP TABLE IF EXISTS inspection_projects;