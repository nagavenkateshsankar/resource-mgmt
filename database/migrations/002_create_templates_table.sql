-- +goose Up
-- +goose StatementBegin
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    fields_schema JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE INDEX idx_templates_deleted_at ON templates(deleted_at);
CREATE INDEX idx_templates_name ON templates(name);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_is_active ON templates(is_active);
CREATE INDEX idx_templates_created_by ON templates(created_by);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_templates_created_by;
DROP INDEX IF EXISTS idx_templates_is_active;
DROP INDEX IF EXISTS idx_templates_category;
DROP INDEX IF EXISTS idx_templates_name;
DROP INDEX IF EXISTS idx_templates_deleted_at;
DROP TABLE IF EXISTS templates;
-- +goose StatementEnd