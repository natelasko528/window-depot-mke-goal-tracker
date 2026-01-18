-- ========================================
-- GAMIFICATION SYSTEM
-- ========================================
-- This migration adds XP, levels, achievements, badges, challenges, and rewards
-- to enable a complete gamification layer

-- ========================================
-- 1. ADD GAMIFICATION FIELDS TO USERS TABLE
-- ========================================

-- Add XP and level tracking to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievements TEXT[] DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS achievement_progress JSONB DEFAULT '{}';

-- Add streak tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_activity_date TEXT;

-- Add sales tracking (for appointments that became sales)
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;

-- ========================================
-- 2. CREATE ACHIEVEMENTS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS achievements (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL, -- 'bronze', 'silver', 'gold', 'diamond', 'platinum', 'legendary'
  icon TEXT NOT NULL, -- emoji or icon identifier
  xp_reward INTEGER DEFAULT 0,
  tier TEXT NOT NULL, -- Same as category for UI display
  criteria JSONB NOT NULL, -- JSON object describing unlock criteria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default achievements
INSERT INTO achievements (id, name, description, category, icon, xp_reward, tier, criteria) VALUES
-- Getting Started (Bronze)
('first_goal', 'First Goal', 'Complete your first daily goal', 'bronze', '🎯', 25, 'bronze', '{"type": "goal_completed", "count": 1}'),
('first_post', 'First Post', 'Post to feed for the first time', 'bronze', '📝', 25, 'bronze', '{"type": "feed_posts", "count": 1}'),
('first_appointment', 'First Appointment', 'Log your first appointment', 'bronze', '🤝', 25, 'bronze', '{"type": "appointments", "count": 1}'),
('social_butterfly', 'Social Butterfly', 'Receive 5 likes on your posts', 'bronze', '👍', 50, 'bronze', '{"type": "likes_received", "count": 5}'),

-- Consistency (Silver)
('streak_3', '3-Day Streak', 'Hit all goals 3 days in a row', 'silver', '🔥', 100, 'silver', '{"type": "streak", "count": 3}'),
('streak_7', '7-Day Streak', 'Hit all goals 7 days in a row', 'silver', '🔥', 200, 'silver', '{"type": "streak", "count": 7}'),
('streak_30', '30-Day Streak', 'Hit all goals 30 days in a row', 'silver', '🔥', 500, 'silver', '{"type": "streak", "count": 30}'),
('weekly_warrior', 'Weekly Warrior', 'Hit all goals every day this week', 'silver', '📅', 150, 'silver', '{"type": "weekly_perfect", "count": 1}'),

-- Performance (Gold)
('perfectionist', 'Perfectionist', 'Hit 100% of goals 10 days', 'gold', '💯', 300, 'gold', '{"type": "perfect_days", "count": 10}'),
('overachiever', 'Overachiever', 'Exceed all goals by 2x in one day', 'gold', '🚀', 250, 'gold', '{"type": "exceed_goals", "multiplier": 2}'),
('star_performer', 'Star Performer', 'Rank #1 on leaderboard', 'gold', '⭐', 400, 'gold', '{"type": "leaderboard_rank", "rank": 1}'),
('consistency_champion', 'Consistency Champion', 'Never missed a goal for 30 days', 'gold', '👑', 600, 'gold', '{"type": "consistency", "days": 30}'),

-- Volume (Diamond)
('century', 'Century', '100 total activities in a week', 'diamond', '💪', 500, 'diamond', '{"type": "weekly_activities", "count": 100}'),
('thousand_club', 'Thousand Club', '1000 total activities all-time', 'diamond', '🏆', 1000, 'diamond', '{"type": "total_activities", "count": 1000}'),
('call_master', 'Call Master', '100 callbacks in a month', 'diamond', '📞', 800, 'diamond', '{"type": "monthly_callbacks", "count": 100}'),
('demo_pro', 'Demo Pro', '50 demos in a month', 'diamond', '🎬', 700, 'diamond', '{"type": "monthly_demos", "count": 50}'),

-- Social (Platinum)
('popular', 'Popular', 'Receive 100 likes all-time', 'platinum', '🌟', 600, 'platinum', '{"type": "likes_received", "count": 100}'),
('conversationalist', 'Conversationalist', '100 comments posted', 'platinum', '💬', 500, 'platinum', '{"type": "comments_posted", "count": 100}'),
('influencer', 'Influencer', '50 posts created', 'platinum', '📣', 700, 'platinum', '{"type": "feed_posts", "count": 50}'),
('team_player', 'Team Player', 'Like 100 posts', 'platinum', '🤝', 400, 'platinum', '{"type": "likes_given", "count": 100}'),

-- Sales (Legendary)
('deal_closer', 'Deal Closer', '10 sales logged', 'legendary', '💰', 1000, 'legendary', '{"type": "sales", "count": 10}'),
('sales_master', 'Sales Master', '50 sales logged', 'legendary', '🎯', 2500, 'legendary', '{"type": "sales", "count": 50}'),
('revenue_king', 'Revenue King', '100 sales logged', 'legendary', '📈', 5000, 'legendary', '{"type": "sales", "count": 100}')
ON CONFLICT (id) DO NOTHING;

-- ========================================
-- 3. CREATE CHALLENGES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  challenge_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'team'
  goal_type TEXT NOT NULL, -- 'activities', 'goals_met', 'appointments', 'posts', 'team_goal', etc.
  goal_value INTEGER NOT NULL,
  xp_reward INTEGER DEFAULT 0,
  start_date TEXT NOT NULL, -- ISO 8601 format (YYYY-MM-DD)
  end_date TEXT NOT NULL, -- ISO 8601 format (YYYY-MM-DD)
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID, -- Manager who created it (optional)
  target_users TEXT[], -- Empty array = all users, or specific user IDs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_challenges_active ON challenges(is_active);
CREATE INDEX IF NOT EXISTS idx_challenges_dates ON challenges(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_challenges_type ON challenges(challenge_type);

-- ========================================
-- 4. CREATE USER_CHALLENGES TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  challenge_id UUID NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_challenges_user ON user_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_challenge ON user_challenges(challenge_id);
CREATE INDEX IF NOT EXISTS idx_user_challenges_completed ON user_challenges(completed);

-- ========================================
-- 5. CREATE REWARDS TABLE (Virtual + Real)
-- ========================================

CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_type TEXT NOT NULL, -- 'virtual', 'real'
  reward_category TEXT, -- 'theme', 'badge', 'title', 'gift_card', 'team_lunch', etc.
  required_level INTEGER, -- Level required to unlock (optional)
  required_achievements TEXT[], -- Achievement IDs required (optional)
  icon TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default virtual rewards
INSERT INTO rewards (name, description, reward_type, reward_category, required_level, icon) VALUES
('Dark Mode Master', 'Unlock premium dark theme', 'virtual', 'theme', 3, '🌙'),
('Golden Badge', 'Unlock golden profile badge', 'virtual', 'badge', 5, '🏅'),
('Sales Legend Title', 'Unlock "Sales Legend" title', 'virtual', 'title', 6, '👑'),
('AI Coach Plus', 'Unlock exclusive AI coach personality', 'virtual', 'ai_coach', 7, '🤖')
ON CONFLICT DO NOTHING;

-- ========================================
-- 6. CREATE USER_REWARDS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS user_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  reward_id UUID NOT NULL REFERENCES rewards(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  claimed BOOLEAN DEFAULT FALSE,
  claimed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, reward_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_rewards_user ON user_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_reward ON user_rewards(reward_id);
CREATE INDEX IF NOT EXISTS idx_user_rewards_claimed ON user_rewards(claimed);

-- ========================================
-- 7. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_rewards ENABLE ROW LEVEL SECURITY;

-- Create RLS policies: Allow all operations for team app (no authentication required)
CREATE POLICY "allow_all_achievements" ON achievements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_challenges" ON challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_user_challenges" ON user_challenges FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_rewards" ON rewards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_user_rewards" ON user_rewards FOR ALL USING (true) WITH CHECK (true);

-- ========================================
-- 8. ADD TABLES TO REALTIME PUBLICATION
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE achievements;
ALTER PUBLICATION supabase_realtime ADD TABLE challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE user_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE rewards;
ALTER PUBLICATION supabase_realtime ADD TABLE user_rewards;

-- ========================================
-- 9. ADD SALES TRACKING TO APPOINTMENTS
-- ========================================

-- Add outcome field to appointments to track if it became a sale
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome TEXT; -- 'pending', 'sale', 'no_sale', 'follow_up'
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS sale_amount DECIMAL(10, 2);
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS outcome_date TEXT; -- ISO 8601 format

-- Create index
CREATE INDEX IF NOT EXISTS idx_appointments_outcome ON appointments(outcome);
