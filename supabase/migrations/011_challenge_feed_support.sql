-- ========================================
-- CHALLENGE FEED SUPPORT
-- ========================================
-- This migration adds support for challenge posts in the feed
-- by extending the post_type constraint and adding metadata storage

-- ========================================
-- 1. UPDATE POST_TYPE CONSTRAINT
-- ========================================
-- Drop existing constraint and add new one with 'challenge' type

-- Drop the existing post_type check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE table_name = 'feed_posts'
    AND constraint_name = 'feed_posts_post_type_check'
  ) THEN
    ALTER TABLE feed_posts DROP CONSTRAINT feed_posts_post_type_check;
  END IF;
END $$;

-- Add new constraint with 'challenge' included
ALTER TABLE feed_posts
  ADD CONSTRAINT feed_posts_post_type_check
  CHECK (post_type IN ('achievement', 'manual', 'announcement', 'challenge'));

-- ========================================
-- 2. ADD METADATA COLUMN
-- ========================================
-- JSONB column to store challenge details:
-- - challengeId: UUID of the associated challenge
-- - goalType: Type of goal (activities, goals_met, etc.)
-- - goalValue: Target value for the challenge
-- - endDate: When the challenge ends

ALTER TABLE feed_posts ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ========================================
-- 3. CREATE INDEX FOR CHALLENGE LOOKUPS
-- ========================================
-- GIN index for efficient JSONB queries on metadata

CREATE INDEX IF NOT EXISTS idx_feed_posts_metadata ON feed_posts USING GIN(metadata);

-- Index for finding posts by challenge ID specifically
CREATE INDEX IF NOT EXISTS idx_feed_posts_challenge_id ON feed_posts((metadata->>'challengeId'))
  WHERE post_type = 'challenge';

-- ========================================
-- COMPLETION
-- ========================================
-- Challenge feed support is now ready!
--
-- Changes:
-- - post_type constraint now includes 'challenge'
-- - metadata JSONB column added for storing challenge details
-- - GIN index added for efficient metadata queries
-- - Partial index added for challenge ID lookups
