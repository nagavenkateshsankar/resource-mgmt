-- +goose Up
-- +goose StatementBegin
CREATE TABLE inspection_data (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    field_name VARCHAR(255) NOT NULL,
    field_value TEXT,
    field_type VARCHAR(100),
    section_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspection_data_inspection_id ON inspection_data(inspection_id);
CREATE INDEX idx_inspection_data_field_name ON inspection_data(field_name);
CREATE INDEX idx_inspection_data_section_name ON inspection_data(section_name);
CREATE INDEX idx_inspection_data_field_type ON inspection_data(field_type);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_inspection_data_field_type;
DROP INDEX IF EXISTS idx_inspection_data_section_name;
DROP INDEX IF EXISTS idx_inspection_data_field_name;
DROP INDEX IF EXISTS idx_inspection_data_inspection_id;
DROP TABLE IF EXISTS inspection_data;
-- +goose StatementEnd