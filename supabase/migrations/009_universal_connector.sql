-- Universal OAuth2 Connector System - Database Schema
-- Migration: 009_universal_connector.sql

-- Connector registry (app catalog metadata)
CREATE TABLE IF NOT EXISTS connector_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  icon_url TEXT,
  description TEXT,
  oauth_endpoints JSONB,
  api_base_url TEXT,
  connection_type TEXT NOT NULL CHECK (connection_type IN ('oauth2', 'api_key', 'webhook', 'hybrid')),
  required_scopes TEXT[],
  metadata JSONB,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- API keys for external access
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User webhooks (outbound)
CREATE TABLE IF NOT EXISTS user_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'disabled')),
  last_triggered_at TIMESTAMPTZ,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Webhook delivery logs
CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES user_webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  delivery_time_ms INTEGER,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Extend integration_sync_status with Google OAuth fields
DO $$ 
BEGIN
  -- Add google_user_id column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'integration_sync_status' 
                 AND column_name = 'google_user_id') THEN
    ALTER TABLE integration_sync_status ADD COLUMN google_user_id TEXT;
  END IF;

  -- Add approved_at column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'integration_sync_status' 
                 AND column_name = 'approved_at') THEN
    ALTER TABLE integration_sync_status ADD COLUMN approved_at TIMESTAMPTZ;
  END IF;

  -- Add connection_metadata column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'integration_sync_status' 
                 AND column_name = 'connection_metadata') THEN
    ALTER TABLE integration_sync_status ADD COLUMN connection_metadata JSONB;
  END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_webhooks_user_id ON user_webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_status ON user_webhooks(status);
CREATE INDEX IF NOT EXISTS idx_user_webhooks_events ON user_webhooks USING GIN(events);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook_id ON webhook_delivery_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_created_at ON webhook_delivery_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_success ON webhook_delivery_logs(success);
CREATE INDEX IF NOT EXISTS idx_connector_definitions_category ON connector_definitions(category);
CREATE INDEX IF NOT EXISTS idx_connector_definitions_enabled ON connector_definitions(enabled);
CREATE INDEX IF NOT EXISTS idx_integration_sync_status_google_user ON integration_sync_status(google_user_id) WHERE google_user_id IS NOT NULL;

-- Triggers for updated_at
CREATE TRIGGER update_connector_definitions_updated_at
  BEFORE UPDATE ON connector_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_webhooks_updated_at
  BEFORE UPDATE ON user_webhooks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE connector_definitions;
ALTER PUBLICATION supabase_realtime ADD TABLE api_keys;
ALTER PUBLICATION supabase_realtime ADD TABLE user_webhooks;

-- Insert initial connector definitions for existing integrations
INSERT INTO connector_definitions (id, name, category, description, connection_type, api_base_url, required_scopes, metadata, enabled) VALUES
  ('jotform', 'Jotform', 'Forms', 'Connect Jotform to sync form submissions and manage webhooks', 'api_key', 'https://api.jotform.com', NULL, '{"website": "https://www.jotform.com", "auth_method": "api_key"}', true),
  ('marketsharp', 'Marketsharp', 'CRM', 'Sync leads and contacts from Marketsharp CRM', 'api_key', 'https://api.marketsharp.com', NULL, '{"website": "https://www.marketsharp.com", "auth_method": "api_key"}', true),
  ('gohighlevel', 'GoHighLevel', 'CRM', 'Connect GoHighLevel to sync contacts, opportunities, and appointments', 'oauth2', 'https://services.leadconnectorhq.com', ARRAY['contacts.readonly', 'contacts.write', 'opportunities.readonly', 'opportunities.write'], '{"website": "https://www.gohighlevel.com", "auth_method": "oauth2", "oauth_authorization_url": "https://marketplace.gohighlevel.com/oauth/chooselocation", "oauth_token_url": "https://services.leadconnectorhq.com/oauth/token"}', true),
  ('zoom', 'Zoom', 'Communication', 'Connect Zoom to manage meetings and webinars', 'oauth2', 'https://api.zoom.us/v2', ARRAY['meeting:write', 'meeting:read', 'user:read'], '{"website": "https://zoom.us", "auth_method": "oauth2", "oauth_authorization_url": "https://zoom.us/oauth/authorize", "oauth_token_url": "https://zoom.us/oauth/token", "supports_pkce": true}', true)
ON CONFLICT (id) DO NOTHING;
