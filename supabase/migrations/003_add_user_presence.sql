-- Add last_activity tracking to users table (optional, for fallback)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP DEFAULT NOW();

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity);
