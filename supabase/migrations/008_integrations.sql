-- Integration tables for Jotform, Marketsharp, GoHighLevel, and Zoom

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL, -- 'jotform', 'marketsharp', 'gohighlevel', or 'zoom'
  form_id TEXT,
  submission_id TEXT,
  data JSONB,
  received_at TIMESTAMPTZ,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Integration sync status table
CREATE TABLE IF NOT EXISTS integration_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  integration_type TEXT NOT NULL, -- 'jotform', 'marketsharp', 'gohighlevel', or 'zoom'
  last_sync TIMESTAMPTZ,
  last_webhook_received TIMESTAMPTZ,
  sync_count INTEGER DEFAULT 0,
  error_message TEXT,
  status TEXT DEFAULT 'idle', -- 'idle', 'syncing', 'error', 'connected'
  location_id TEXT, -- For GoHighLevel location ID
  oauth_tokens JSONB, -- Encrypted OAuth tokens (access_token, refresh_token, expires_at)
  webhook_subscription_id TEXT, -- For Zoom event subscription ID
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, integration_type)
);

-- Integration data cache (for synced submissions/leads/contacts/meetings)
CREATE TABLE IF NOT EXISTS integration_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  integration_type TEXT NOT NULL,
  external_id TEXT NOT NULL, -- ID from external service
  data_type TEXT NOT NULL, -- 'submission', 'lead', 'contact', 'opportunity', 'appointment', 'meeting'
  data JSONB NOT NULL,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, integration_type, external_id, data_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_source ON webhook_events(source);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_integration_sync_status_user ON integration_sync_status(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_status_type ON integration_sync_status(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_sync_status_location ON integration_sync_status(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_integration_data_user ON integration_data(user_id);
CREATE INDEX IF NOT EXISTS idx_integration_data_type ON integration_data(integration_type, data_type);

-- Enable realtime for sync status
ALTER PUBLICATION supabase_realtime ADD TABLE integration_sync_status;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_sync_status_updated_at
  BEFORE UPDATE ON integration_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_integration_data_updated_at
  BEFORE UPDATE ON integration_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
