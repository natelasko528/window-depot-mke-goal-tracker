-- ========================================
-- AI COACH ENHANCEMENTS
-- ========================================
-- This migration adds support for tracking AI coach actions
-- and enhances the audit log for AI-initiated operations

-- ========================================
-- 1. ADD AI TRACKING TO AUDIT LOG
-- ========================================

-- Add column to track if action was performed via AI coach
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS via_ai BOOLEAN DEFAULT FALSE;

-- Add column to track the specific AI tool used
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS ai_tool TEXT;

-- Create index for AI-related queries
CREATE INDEX IF NOT EXISTS idx_audit_log_via_ai ON audit_log(via_ai) WHERE via_ai = TRUE;

-- Create index for AI tool queries
CREATE INDEX IF NOT EXISTS idx_audit_log_ai_tool ON audit_log(ai_tool) WHERE ai_tool IS NOT NULL;

-- ========================================
-- 2. CREATE AI CHAT HISTORY TABLE (Optional)
-- ========================================
-- Store AI chat conversations for analysis and debugging

CREATE TABLE IF NOT EXISTS ai_chat_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- 'user' or 'assistant'
  content TEXT NOT NULL,
  tool_calls JSONB, -- Array of tool calls made (if any)
  model TEXT, -- Model used for response
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_user_id ON ai_chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_session_id ON ai_chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_history_timestamp ON ai_chat_history(timestamp DESC);

-- Enable RLS
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ai_chat_history" ON ai_chat_history FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_chat_history;

-- ========================================
-- 3. CREATE AI TOOL USAGE METRICS TABLE
-- ========================================
-- Track which AI tools are used most frequently for analytics

CREATE TABLE IF NOT EXISTS ai_tool_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tool_name TEXT NOT NULL,
  success BOOLEAN DEFAULT TRUE,
  execution_time_ms INTEGER,
  args_summary TEXT, -- Brief summary of arguments (no sensitive data)
  result_summary TEXT, -- Brief summary of result (no sensitive data)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ai_tool_metrics_user_id ON ai_tool_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tool_metrics_tool_name ON ai_tool_metrics(tool_name);
CREATE INDEX IF NOT EXISTS idx_ai_tool_metrics_timestamp ON ai_tool_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tool_metrics_success ON ai_tool_metrics(success);

-- Enable RLS
ALTER TABLE ai_tool_metrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_ai_tool_metrics" ON ai_tool_metrics FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ai_tool_metrics;

-- ========================================
-- 4. ADD DAILY LOGS TIMESTAMP TRACKING
-- ========================================
-- Add timestamp to daily_logs to track when entries were made
-- This helps answer questions like "what time do I usually log demos?"

-- Note: This may already exist as created_at, but adding updated_at for tracking modifications
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for time-of-day analysis
CREATE INDEX IF NOT EXISTS idx_daily_logs_updated_at ON daily_logs(updated_at);

-- ========================================
-- 5. CLEANUP FUNCTIONS FOR AI TABLES
-- ========================================

-- Function to keep only last 10000 AI chat history entries per user
CREATE OR REPLACE FUNCTION cleanup_old_ai_chat_history()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_chat_history
  WHERE id NOT IN (
    SELECT id FROM ai_chat_history
    ORDER BY timestamp DESC
    LIMIT 10000
  );
END;
$$ LANGUAGE plpgsql;

-- Function to keep only last 90 days of AI tool metrics
CREATE OR REPLACE FUNCTION cleanup_old_ai_tool_metrics()
RETURNS void AS $$
BEGIN
  DELETE FROM ai_tool_metrics
  WHERE timestamp < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- COMPLETION
-- ========================================
-- AI Coach enhancement tables are now ready!
--
-- New tables:
-- - ai_chat_history: Stores conversation history
-- - ai_tool_metrics: Tracks tool usage patterns
--
-- Enhanced columns:
-- - audit_log.via_ai: Boolean flag for AI-initiated actions
-- - audit_log.ai_tool: Name of AI tool used
-- - daily_logs.updated_at: Timestamp for time analysis
