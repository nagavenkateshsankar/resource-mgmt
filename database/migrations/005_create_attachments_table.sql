-- +goose Up
-- +goose StatementBegin
CREATE TABLE attachments (
    id SERIAL PRIMARY KEY,
    inspection_id INTEGER NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    description TEXT,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attachments_inspection_id ON attachments(inspection_id);
CREATE INDEX idx_attachments_file_type ON attachments(file_type);
CREATE INDEX idx_attachments_uploaded_at ON attachments(uploaded_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_attachments_uploaded_at;
DROP INDEX IF EXISTS idx_attachments_file_type;
DROP INDEX IF EXISTS idx_attachments_inspection_id;
DROP TABLE IF EXISTS attachments;
-- +goose StatementEnd