-- ============================================
-- 🧞 DJINN MARKETS - FULL DATABASE SETUP
-- ============================================
-- Copy and paste this ENTIRE file into
-- Supabase Dashboard > SQL Editor > New Query
-- Then click "Run" (Ctrl/Cmd + Enter)
-- ============================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL DEFAULT 'New User',
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  banner_url TEXT,
  views INTEGER DEFAULT 0,
  gems NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. COMMENTS TABLE
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_slug TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  text TEXT NOT NULL,
  image_url TEXT,
  position TEXT,
  position_amount TEXT,
  likes_count INTEGER DEFAULT 0,
  parent_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COMMENT LIKES TABLE
CREATE TABLE IF NOT EXISTS comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID,
  wallet_address TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, wallet_address)
);

-- 4. MARKET DATA TABLE
CREATE TABLE IF NOT EXISTS market_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  live_price DECIMAL DEFAULT 50,
  volume DECIMAL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ACTIVITY TABLE
CREATE TABLE IF NOT EXISTS activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  action TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  sol_amount DECIMAL,
  shares DECIMAL,
  market_title TEXT NOT NULL,
  market_slug TEXT NOT NULL,
  market_icon TEXT,
  outcome_name TEXT,
  order_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MARKETS TABLE (Full with Oracle fields)
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  icon TEXT,
  creator_wallet TEXT NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT FALSE,
  winning_outcome TEXT,
  total_yes_pool DECIMAL DEFAULT 0,
  total_no_pool DECIMAL DEFAULT 0,
  resolution_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Blockchain fields
  market_pda TEXT,
  yes_token_mint TEXT,
  no_token_mint TEXT,
  tx_signature TEXT,
  resolution_source TEXT DEFAULT 'DERIVED',
  -- Category & Display
  category TEXT NOT NULL DEFAULT 'Trending',
  options JSONB,
  is_archived BOOLEAN DEFAULT FALSE,
  -- Oracle/Cerberus fields
  monitoring_enabled BOOLEAN DEFAULT FALSE,
  verification_status TEXT DEFAULT 'none',
  verification_updated_at TIMESTAMP WITH TIME ZONE,
  cerberus_verdict TEXT,
  cerberus_confidence NUMERIC,
  cerberus_analysis TEXT,
  cerberus_sources JSONB,
  resolution_method TEXT
);

-- 7. BETS TABLE
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_slug TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  side TEXT NOT NULL,
  amount DECIMAL NOT NULL,
  sol_amount DECIMAL NOT NULL,
  shares DECIMAL NOT NULL,
  entry_price DECIMAL NOT NULL,
  payout DECIMAL,
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_wallet TEXT NOT NULL,
  following_wallet TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_wallet, following_wallet)
);

-- 9. ACHIEVEMENTS TABLE
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  xp INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. USER ACHIEVEMENTS
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL,
  achievement_code TEXT,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_wallet, achievement_code)
);

-- 11. ORACLE CONFIG
CREATE TABLE IF NOT EXISTS oracle_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. ORACLE SOURCES
CREATE TABLE IF NOT EXISTS oracle_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  last_fetched TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  fetch_interval_minutes INTEGER DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. RESOLUTION SUGGESTIONS
CREATE TABLE IF NOT EXISTS resolution_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_slug TEXT NOT NULL,
  market_title TEXT,
  suggested_outcome TEXT NOT NULL CHECK (suggested_outcome IN ('YES', 'NO', 'UNCERTAIN')),
  confidence DECIMAL CHECK (confidence >= 0 AND confidence <= 100),
  evidence JSONB DEFAULT '[]',
  ai_analysis TEXT,
  ai_provider TEXT,
  sources_used TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. ORACLE LOGS
CREATE TABLE IF NOT EXISTS oracle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('system', 'fetch', 'analyze', 'suggest', 'approve', 'reject', 'error', 'warning')),
  source TEXT,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_archived ON markets(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_bets_wallet ON bets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_slug);
CREATE INDEX IF NOT EXISTS idx_activity_market ON activity(market_slug);
CREATE INDEX IF NOT EXISTS idx_activity_wallet ON activity(wallet_address);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON resolution_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_logs_created ON oracle_logs(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Increment/Decrement Likes
CREATE OR REPLACE FUNCTION increment_likes(p_comment_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE comments SET likes_count = likes_count + 1 WHERE id = p_comment_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_likes(p_comment_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = p_comment_id;
END;
$$ LANGUAGE plpgsql;

-- Add Gems
CREATE OR REPLACE FUNCTION add_gems(user_wallet TEXT, amount_to_add NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET gems = COALESCE(gems, 0) + amount_to_add
  WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql;

-- Enable Market Monitoring
CREATE OR REPLACE FUNCTION enable_market_monitoring(p_slug TEXT)
RETURNS void AS $$
BEGIN
  UPDATE markets SET monitoring_enabled = TRUE WHERE slug = p_slug;
END;
$$ LANGUAGE plpgsql;

-- Get Oracle Config
CREATE OR REPLACE FUNCTION get_oracle_config(config_key TEXT)
RETURNS JSONB AS $$
  SELECT value FROM oracle_config WHERE key = config_key;
$$ LANGUAGE sql;

-- Cleanup Old Logs
CREATE OR REPLACE FUNCTION cleanup_old_oracle_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM oracle_logs WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE oracle_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES (Public Access)
-- ============================================

-- Profiles
DROP POLICY IF EXISTS "Profiles viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can update profile" ON profiles;
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Anyone can insert profile" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update profile" ON profiles FOR UPDATE USING (true);

-- Comments
DROP POLICY IF EXISTS "Comments viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Anyone can update comments" ON comments;
CREATE POLICY "Comments viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comments" ON comments FOR UPDATE USING (true);

-- Comment Likes
DROP POLICY IF EXISTS "Likes viewable by everyone" ON comment_likes;
DROP POLICY IF EXISTS "Anyone can like" ON comment_likes;
DROP POLICY IF EXISTS "Anyone can unlike" ON comment_likes;
CREATE POLICY "Likes viewable by everyone" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can like" ON comment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can unlike" ON comment_likes FOR DELETE USING (true);

-- Market Data
DROP POLICY IF EXISTS "Market data viewable by everyone" ON market_data;
DROP POLICY IF EXISTS "Anyone can insert market data" ON market_data;
DROP POLICY IF EXISTS "Anyone can update market data" ON market_data;
CREATE POLICY "Market data viewable by everyone" ON market_data FOR SELECT USING (true);
CREATE POLICY "Anyone can insert market data" ON market_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update market data" ON market_data FOR UPDATE USING (true);

-- Activity
DROP POLICY IF EXISTS "Activity viewable by everyone" ON activity;
DROP POLICY IF EXISTS "Anyone can create activity" ON activity;
CREATE POLICY "Activity viewable by everyone" ON activity FOR SELECT USING (true);
CREATE POLICY "Anyone can create activity" ON activity FOR INSERT WITH CHECK (true);

-- Markets
DROP POLICY IF EXISTS "Markets viewable by everyone" ON markets;
DROP POLICY IF EXISTS "Anyone can create markets" ON markets;
DROP POLICY IF EXISTS "Anyone can update markets" ON markets;
CREATE POLICY "Markets viewable by everyone" ON markets FOR SELECT USING (true);
CREATE POLICY "Anyone can create markets" ON markets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update markets" ON markets FOR UPDATE USING (true);

-- Bets
DROP POLICY IF EXISTS "Bets viewable by everyone" ON bets;
DROP POLICY IF EXISTS "Anyone can place bets" ON bets;
DROP POLICY IF EXISTS "Anyone can update bets" ON bets;
DROP POLICY IF EXISTS "Anyone can delete bets" ON bets;
CREATE POLICY "Bets viewable by everyone" ON bets FOR SELECT USING (true);
CREATE POLICY "Anyone can place bets" ON bets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update bets" ON bets FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete bets" ON bets FOR DELETE USING (true);

-- Follows
DROP POLICY IF EXISTS "Follows viewable by everyone" ON follows;
DROP POLICY IF EXISTS "Users can follow" ON follows;
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Follows viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (true);

-- Achievements
DROP POLICY IF EXISTS "Achievements viewable by everyone" ON achievements;
CREATE POLICY "Achievements viewable by everyone" ON achievements FOR SELECT USING (true);

-- User Achievements
DROP POLICY IF EXISTS "User achievements viewable by everyone" ON user_achievements;
DROP POLICY IF EXISTS "Anyone can earn achievements" ON user_achievements;
CREATE POLICY "User achievements viewable by everyone" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "Anyone can earn achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- Oracle Config
DROP POLICY IF EXISTS "Oracle config readable" ON oracle_config;
DROP POLICY IF EXISTS "Oracle config writable" ON oracle_config;
CREATE POLICY "Oracle config readable" ON oracle_config FOR SELECT USING (true);
CREATE POLICY "Oracle config writable" ON oracle_config FOR ALL USING (true);

-- Oracle Sources
DROP POLICY IF EXISTS "Oracle sources readable" ON oracle_sources;
DROP POLICY IF EXISTS "Oracle sources writable" ON oracle_sources;
CREATE POLICY "Oracle sources readable" ON oracle_sources FOR SELECT USING (true);
CREATE POLICY "Oracle sources writable" ON oracle_sources FOR ALL USING (true);

-- Resolution Suggestions
DROP POLICY IF EXISTS "Suggestions readable" ON resolution_suggestions;
DROP POLICY IF EXISTS "Suggestions writable" ON resolution_suggestions;
CREATE POLICY "Suggestions readable" ON resolution_suggestions FOR SELECT USING (true);
CREATE POLICY "Suggestions writable" ON resolution_suggestions FOR ALL USING (true);

-- Oracle Logs
DROP POLICY IF EXISTS "Logs readable" ON oracle_logs;
DROP POLICY IF EXISTS "Logs writable" ON oracle_logs;
CREATE POLICY "Logs readable" ON oracle_logs FOR SELECT USING (true);
CREATE POLICY "Logs writable" ON oracle_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- SEED DATA
-- ============================================

-- Achievements
INSERT INTO achievements (code, name, description, image_url, xp)
VALUES
('FIRST_MARKET', 'Market Maker', 'Created your first prediction market', '/badges/first-market.png', 50),
('FIRST_BET', 'Skin in the Game', 'Placed your first bet', '/badges/first-bet.png', 30),
('FIRST_WIN', 'First Blood', 'Won your first prediction bet', '/badges/first-win.png', 50),
('COMMENTATOR', 'Voice of the Crowd', 'Left your first comment', '/badges/commentator.png', 20),
('WHALE', 'Whale Alert', 'Placed a bet of $1,000 or more', '/badges/whale.png', 100),
('MARKET_5', 'Serial Creator', 'Created 5 prediction markets', '/badges/market-5.png', 150),
('WIN_3', 'Hat Trick', 'Won 3 predictions', '/badges/win-3.png', 100),
('MARKET_10', 'Factory Owner', 'Created 10 prediction markets', '/badges/market-10.png', 300),
('WIN_STREAK_3', 'Prophet', 'Won 3 predictions in a row', '/badges/prophet.png', 250),
('MARKET_25', 'Djinn Master', 'Created 25 prediction markets', '/badges/djinn-master.png', 500),
('WIN_STREAK_5', 'Oracle', 'Won 5 predictions in a row', '/badges/oracle.png', 500)
ON CONFLICT (code) DO NOTHING;

-- Oracle Config
INSERT INTO oracle_config (key, value) VALUES
  ('bot_enabled', 'false'),
  ('fetch_interval_minutes', '15'),
  ('ai_provider', '"gemini"'),
  ('min_confidence_threshold', '70'),
  ('auto_approve_high_confidence', 'false'),
  ('protocol_authority', '"G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma"')
ON CONFLICT (key) DO NOTHING;

-- Oracle Sources
INSERT INTO oracle_sources (name, display_name, config) VALUES
  ('twitter', 'Twitter/X', '{"bearer_token": "", "search_endpoint": "https://api.twitter.com/2/tweets/search/recent"}'),
  ('reddit', 'Reddit', '{"client_id": "", "client_secret": "", "user_agent": "DjinnOracle/1.0"}'),
  ('google', 'Google Search', '{"api_key": "", "cx": "", "endpoint": "https://www.googleapis.com/customsearch/v1"}'),
  ('gemini', 'Gemini AI', '{"api_key": "", "model": "gemini-1.5-pro"}'),
  ('openai', 'OpenAI', '{"api_key": "", "model": "gpt-4o-mini"}')
ON CONFLICT (name) DO NOTHING;

-- System log
INSERT INTO oracle_logs (type, source, message, metadata) VALUES
  ('system', 'setup', 'Database initialized successfully', '{"version": "2.0.0"}');

-- ============================================
-- ✅ SETUP COMPLETE
-- ============================================
-- If you see this message without errors,
-- your database is ready to use!
-- ============================================
