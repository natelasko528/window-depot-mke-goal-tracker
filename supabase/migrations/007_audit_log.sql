-- ========================================
-- AUDIT LOG SYSTEM
-- ========================================
-- This migration adds comprehensive audit logging for admin actions
-- and system events to track all changes and operations

-- ========================================
-- 1. CREATE AUDIT_LOG TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- User who performed the action (null for system actions)
  user_name TEXT, -- Cached user name for faster queries
  action TEXT NOT NULL, -- Action type (e.g., 'user_created', 'goal_changed', 'bulk_operation')
  entity_type TEXT, -- Type of entity affected (e.g., 'user', 'goals', 'data')
  entity_id TEXT, -- ID of affected entity (if applicable)
  details JSONB DEFAULT '{}', -- Detailed information about the action
  ip_address TEXT, -- IP address (if available)
  user_agent TEXT, -- User agent (if available)
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

-- Index for querying by user
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);

-- Index for querying by action type
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Index for querying by entity type
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);

-- Index for timestamp-based queries (most recent first)
CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);

-- Composite index for user + timestamp queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_timestamp ON audit_log(user_id, timestamp DESC);

-- ========================================
-- 3. CREATE USER ROLES & PERMISSIONS ENHANCEMENTS
-- ========================================

-- Add new role types to users table (if not already added)
-- Roles: employee, team_lead, manager, observer, admin
-- Note: We'll handle role validation in the application layer

-- Add archived status to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_by UUID;

-- Create index for archived status
CREATE INDEX IF NOT EXISTS idx_users_archived ON users(archived);

-- ========================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Allow all operations for team app (no authentication required)
-- In production, you may want to restrict this to admin users only
CREATE POLICY "allow_all_audit_log" ON audit_log
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- 5. ADD TABLE TO REALTIME PUBLICATION
-- ========================================

ALTER PUBLICATION supabase_realtime ADD TABLE audit_log;

-- ========================================
-- 6. CREATE SYSTEM SETTINGS TABLE
-- ========================================

-- Store system-wide settings and configuration
CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB DEFAULT '{}',
  description TEXT,
  updated_by UUID, -- User who last updated this setting
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key);

-- Insert default settings
INSERT INTO system_settings (key, value, description) VALUES
('app_version', '{"version": "2.0.0", "build": "gamification"}', 'Application version information'),
('maintenance_mode', '{"enabled": false}', 'Maintenance mode flag'),
('max_users', '{"limit": 100}', 'Maximum number of users allowed')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_system_settings" ON system_settings FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE system_settings;

-- ========================================
-- 7. CREATE DATA BACKUPS TABLE
-- ========================================

-- Store metadata about data backups/exports
CREATE TABLE IF NOT EXISTS data_backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL, -- 'full_export', 'users_only', 'manual', etc.
  created_by UUID NOT NULL, -- User who created the backup
  created_by_name TEXT, -- Cached user name
  file_size INTEGER, -- Size in bytes (if available)
  record_counts JSONB DEFAULT '{}', -- Count of records per table
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_data_backups_created_by ON data_backups(created_by);
CREATE INDEX IF NOT EXISTS idx_data_backups_created_at ON data_backups(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_backups_type ON data_backups(backup_type);

-- Enable RLS
ALTER TABLE data_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_data_backups" ON data_backups FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE data_backups;

-- ========================================
-- 8. CREATE ERROR LOG TABLE
-- ========================================

-- Store application errors for monitoring
CREATE TABLE IF NOT EXISTS error_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- User who encountered the error
  error_type TEXT NOT NULL, -- Type of error
  error_message TEXT NOT NULL,
  stack_trace TEXT, -- Stack trace (if available)
  context JSONB DEFAULT '{}', -- Additional context
  severity TEXT DEFAULT 'error', -- 'error', 'warning', 'critical'
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_error_log_user_id ON error_log(user_id);
CREATE INDEX IF NOT EXISTS idx_error_log_created_at ON error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_log_severity ON error_log(severity);
CREATE INDEX IF NOT EXISTS idx_error_log_resolved ON error_log(resolved);

-- Enable RLS
ALTER TABLE error_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_error_log" ON error_log FOR ALL USING (true) WITH CHECK (true);

-- Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE error_log;

-- ========================================
-- 9. CREATE FUNCTION TO AUTO-CLEAN OLD LOGS
-- ========================================

-- Function to keep only last 1000 audit log entries
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM audit_log
  WHERE id NOT IN (
    SELECT id FROM audit_log
    ORDER BY timestamp DESC
    LIMIT 1000
  );
END;
$$ LANGUAGE plpgsql;

-- Function to keep only last 90 days of error logs
CREATE OR REPLACE FUNCTION cleanup_old_error_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM error_log
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Note: You can set up periodic jobs to run these cleanup functions
-- using pg_cron or external schedulers

-- ========================================
-- COMPLETION
-- ========================================
-- Audit log system is now ready!
-- All admin actions should be logged to the audit_log table
-- Error tracking is available via error_log table
-- System settings and backup metadata are tracked
