-- =============================================
-- Feed Enhancement: Rich content, reactions, pins
-- =============================================

-- Add new columns to feed_posts for rich content support
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS post_type TEXT DEFAULT 'manual' CHECK (post_type IN ('achievement', 'manual', 'announcement'));
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS mentions UUID[] DEFAULT '{}';
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived'));
ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

-- Create feed_reactions table to replace feed_likes with emoji support
CREATE TABLE IF NOT EXISTS feed_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '🔥', '💪', '🎉', '❤️', '🎯')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id, emoji)
);

-- Create feed_filter_preferences table for user filter preferences
CREATE TABLE IF NOT EXISTS feed_filter_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filter_type TEXT NOT NULL CHECK (filter_type IN ('all', 'achievements', 'manual', 'announcements')),
  sort_by TEXT NOT NULL CHECK (sort_by IN ('recent', 'liked', 'commented')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create feed_read_status table for tracking unread posts
CREATE TABLE IF NOT EXISTS feed_read_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES feed_posts(id) ON DELETE CASCADE,
  read_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_feed_reactions_post_id ON feed_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_reactions_user_id ON feed_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_posts_pinned ON feed_posts(is_pinned) WHERE is_pinned = TRUE;
CREATE INDEX IF NOT EXISTS idx_feed_posts_hashtags ON feed_posts USING GIN(hashtags);
CREATE INDEX IF NOT EXISTS idx_feed_posts_mentions ON feed_posts USING GIN(mentions);
CREATE INDEX IF NOT EXISTS idx_feed_read_status_user_post ON feed_read_status(user_id, post_id);

-- Drop old feed_likes table (keep for backward compatibility via view)
CREATE OR REPLACE VIEW feed_likes AS
SELECT
  post_id,
  user_id,
  created_at
FROM feed_reactions
WHERE emoji = '👍';

-- Enable real-time for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE feed_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_filter_preferences;
ALTER PUBLICATION supabase_realtime ADD TABLE feed_read_status;
