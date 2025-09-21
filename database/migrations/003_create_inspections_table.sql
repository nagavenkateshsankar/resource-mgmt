-- +goose Up
-- +goose StatementBegin
CREATE TABLE inspections (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
    inspector_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    site_location VARCHAR(500) NOT NULL,
    site_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'draft',
    priority VARCHAR(50) DEFAULT 'medium',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    due_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_inspections_deleted_at ON inspections(deleted_at);
CREATE INDEX idx_inspections_template_id ON inspections(template_id);
CREATE INDEX idx_inspections_inspector_id ON inspections(inspector_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_inspections_priority ON inspections(priority);
CREATE INDEX idx_inspections_due_date ON inspections(due_date);
CREATE INDEX idx_inspections_created_at ON inspections(created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_inspections_created_at;
DROP INDEX IF EXISTS idx_inspections_due_date;
DROP INDEX IF EXISTS idx_inspections_priority;
DROP INDEX IF EXISTS idx_inspections_status;
DROP INDEX IF EXISTS idx_inspections_inspector_id;
DROP INDEX IF EXISTS idx_inspections_template_id;
DROP INDEX IF EXISTS idx_inspections_deleted_at;
DROP TABLE IF EXISTS inspections;
-- +goose StatementEnd