-- Password reset tokens for email-based account recovery.

ALTER TABLE ops.app_user
  ADD COLUMN IF NOT EXISTS password_reset_token_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS password_reset_expires_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS idx_app_user_password_reset_token_hash
  ON ops.app_user (password_reset_token_hash)
  WHERE password_reset_token_hash IS NOT NULL;
