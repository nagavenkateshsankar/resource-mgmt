-- +goose Up
-- +goose StatementBegin
-- Add new fields to attachments table for R2 storage support
ALTER TABLE attachments
ADD COLUMN field_id VARCHAR(255),
ADD COLUMN field_name VARCHAR(255),
ADD COLUMN storage_url VARCHAR(1000);

-- Update existing attachments to have empty values for the new fields
UPDATE attachments
SET field_id = '', field_name = '', storage_url = ''
WHERE field_id IS NULL;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
ALTER TABLE attachments
DROP COLUMN field_id,
DROP COLUMN field_name,
DROP COLUMN storage_url;
-- +goose StatementEnd