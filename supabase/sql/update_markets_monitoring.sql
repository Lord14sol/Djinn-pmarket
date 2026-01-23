-- Add monitoring flag to markets table
ALTER TABLE markets ADD COLUMN IF NOT EXISTS monitoring_enabled BOOLEAN DEFAULT FALSE;

-- Function to enable monitoring automatically
CREATE OR REPLACE FUNCTION enable_market_monitoring(p_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE markets SET monitoring_enabled = TRUE WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql;
