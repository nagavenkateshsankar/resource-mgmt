-- +goose Up
-- Increase token column size in user_sessions table to accommodate longer JWT tokens

ALTER TABLE user_sessions ALTER COLUMN token TYPE VARCHAR(1500);
ALTER TABLE user_sessions ALTER COLUMN refresh_token TYPE VARCHAR(1500);

-- +goose Down
-- Revert token column size back to original

ALTER TABLE user_sessions ALTER COLUMN token TYPE VARCHAR(500);
ALTER TABLE user_sessions ALTER COLUMN refresh_token TYPE VARCHAR(500);