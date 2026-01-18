-- Create daily_snapshots table for tracking historical goal tracking data
-- This table stores a snapshot of each user's daily metrics and goal targets

CREATE TABLE IF NOT EXISTS daily_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  date TEXT NOT NULL, -- ISO 8601 format (YYYY-MM-DD)
  reviews_count INTEGER DEFAULT 0,
  demos_count INTEGER DEFAULT 0,
  callbacks_count INTEGER DEFAULT 0,
  reviews_goal INTEGER,
  demos_goal INTEGER,
  callbacks_goal INTEGER,
  goals_met BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate snapshots per user per day
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_snapshots_user_date
  ON daily_snapshots(user_id, date);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_id
  ON daily_snapshots(user_id);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_date
  ON daily_snapshots(date);

CREATE INDEX IF NOT EXISTS idx_daily_snapshots_user_date_range
  ON daily_snapshots(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE daily_snapshots ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Allow all operations for team app (no authentication required)
-- In production, you may want to restrict this to authenticated users
CREATE POLICY "allow_all_operations" ON daily_snapshots
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add table to realtime publication for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE daily_snapshots;
