-- ============================================
-- ORACLE BOT - SUPABASE SCHEMA
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. ORACLE CONFIGURATION
-- Stores global bot settings and API keys
CREATE TABLE IF NOT EXISTS oracle_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial config values
INSERT INTO oracle_config (key, value) VALUES
  ('bot_enabled', 'false'),
  ('fetch_interval_minutes', '15'),
  ('ai_provider', '"gemini"'),
  ('min_confidence_threshold', '70'),
  ('auto_approve_high_confidence', 'false'),
  ('protocol_authority', '"G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma"')
ON CONFLICT (key) DO NOTHING;

-- 2. DATA SOURCES
-- Configuration for each news/social media source
CREATE TABLE IF NOT EXISTS oracle_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,            -- 'twitter', 'reddit', 'google', 'tiktok'
  display_name TEXT NOT NULL,           -- 'Twitter/X', 'Reddit', etc.
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',            -- API keys, endpoints, search params
  last_fetched TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  fetch_interval_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial sources (disabled by default until API keys are added)
INSERT INTO oracle_sources (name, display_name, config) VALUES
  ('twitter', 'Twitter/X', '{"bearer_token": "", "search_endpoint": "https://api.twitter.com/2/tweets/search/recent"}'),
  ('reddit', 'Reddit', '{"client_id": "", "client_secret": "", "user_agent": "DjinnOracle/1.0"}'),
  ('google', 'Google Search', '{"api_key": "", "cx": "", "endpoint": "https://www.googleapis.com/customsearch/v1"}'),
  ('gemini', 'Gemini AI', '{"api_key": "", "model": "gemini-1.5-pro"}'),
  ('openai', 'OpenAI', '{"api_key": "", "model": "gpt-4o-mini"}')
ON CONFLICT (name) DO NOTHING;

-- 3. RESOLUTION SUGGESTIONS
-- AI-generated suggestions awaiting human approval
CREATE TABLE IF NOT EXISTS resolution_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_slug TEXT NOT NULL,
  market_title TEXT,
  suggested_outcome TEXT NOT NULL CHECK (suggested_outcome IN ('YES', 'NO', 'UNCERTAIN')),
  confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 100),
  evidence JSONB DEFAULT '[]',          -- Array of {url, title, snippet, source}
  ai_analysis TEXT,                     -- AI explanation
  ai_provider TEXT,                     -- 'gemini' or 'openai'
  sources_used TEXT[] DEFAULT '{}',     -- ['twitter', 'reddit', 'google']
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by TEXT,                     -- wallet address of reviewer
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON resolution_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_market ON resolution_suggestions(market_slug);

-- 4. ORACLE LOGS
-- Real-time activity logs for the Matrix UI terminal
CREATE TABLE IF NOT EXISTS oracle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('system', 'fetch', 'analyze', 'suggest', 'approve', 'reject', 'error', 'warning')),
  source TEXT,                          -- 'twitter', 'reddit', 'system', etc.
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',          -- Additional data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster log retrieval
CREATE INDEX IF NOT EXISTS idx_logs_created ON oracle_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_type ON oracle_logs(type);

-- Cleanup old logs (keep only last 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_oracle_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM oracle_logs WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE oracle_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Oracle config readable by all" ON oracle_config;
DROP POLICY IF EXISTS "Oracle config writable by service" ON oracle_config;
DROP POLICY IF EXISTS "Oracle sources readable by all" ON oracle_sources;
DROP POLICY IF EXISTS "Oracle sources writable by service" ON oracle_sources;
DROP POLICY IF EXISTS "Suggestions readable by all" ON resolution_suggestions;
DROP POLICY IF EXISTS "Suggestions writable by service" ON resolution_suggestions;
DROP POLICY IF EXISTS "Logs readable by all" ON oracle_logs;
DROP POLICY IF EXISTS "Logs writable by service" ON oracle_logs;

-- Policies (allow all for now, restrict in production)
CREATE POLICY "Oracle config readable by all" ON oracle_config FOR SELECT USING (true);
CREATE POLICY "Oracle config writable by service" ON oracle_config FOR ALL USING (true);

CREATE POLICY "Oracle sources readable by all" ON oracle_sources FOR SELECT USING (true);
CREATE POLICY "Oracle sources writable by service" ON oracle_sources FOR ALL USING (true);

CREATE POLICY "Suggestions readable by all" ON resolution_suggestions FOR SELECT USING (true);
CREATE POLICY "Suggestions writable by service" ON resolution_suggestions FOR ALL USING (true);

CREATE POLICY "Logs readable by all" ON oracle_logs FOR SELECT USING (true);
CREATE POLICY "Logs writable by service" ON oracle_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get config value
CREATE OR REPLACE FUNCTION get_oracle_config(config_key TEXT)
RETURNS JSONB AS $$
  SELECT value FROM oracle_config WHERE key = config_key;
$$ LANGUAGE sql;

-- Function to update source stats
CREATE OR REPLACE FUNCTION update_oracle_source_stats(
  p_source_name TEXT,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_success THEN
    UPDATE oracle_sources 
    SET 
      last_fetched = NOW(),
      fetch_count = fetch_count + 1,
      last_error = NULL
    WHERE name = p_source_name;
  ELSE
    UPDATE oracle_sources 
    SET 
      error_count = error_count + 1,
      last_error = p_error_message
    WHERE name = p_source_name;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Insert initial system log
INSERT INTO oracle_logs (type, source, message, metadata) VALUES
  ('system', 'oracle', 'Oracle Bot schema initialized', '{"version": "1.0.0"}');
