-- +goose Up
-- Increase token and refresh_token column lengths to accommodate longer JWT tokens
-- JWT tokens with multi-org data can exceed 500 characters

ALTER TABLE user_sessions ALTER COLUMN token TYPE TEXT;
ALTER TABLE user_sessions ALTER COLUMN refresh_token TYPE TEXT;

-- +goose Down
-- Revert to original column sizes (may cause data truncation)
ALTER TABLE user_sessions ALTER COLUMN token TYPE VARCHAR(500);
ALTER TABLE user_sessions ALTER COLUMN refresh_token TYPE VARCHAR(500);