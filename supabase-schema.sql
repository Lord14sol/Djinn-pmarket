-- ============================================
-- DJINN MARKETS - SUPABASE SCHEMA (FIXED)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL DEFAULT 'New User',
  bio TEXT DEFAULT '',
  avatar_url TEXT,
  banner_url TEXT,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. MARKETS TABLE (for resolution)
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  creator_wallet TEXT NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT FALSE,
  winning_outcome TEXT, -- 'YES' or 'NO'
  total_yes_pool DECIMAL DEFAULT 0,
  total_no_pool DECIMAL DEFAULT 0,
  resolution_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. BETS TABLE (individual bets for payout calculation)
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  market_slug TEXT NOT NULL,
  wallet_address TEXT NOT NULL,
  side TEXT NOT NULL, -- 'YES' or 'NO'
  amount DECIMAL NOT NULL, -- USD value
  sol_amount DECIMAL NOT NULL,
  shares DECIMAL NOT NULL,
  entry_price DECIMAL NOT NULL, -- price when bet was placed
  payout DECIMAL, -- filled when resolved
  claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- FUNCTIONS FOR LIKES
-- ============================================

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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
DROP POLICY IF EXISTS "Anyone can insert comments" ON comments;
DROP POLICY IF EXISTS "Anyone can update comments" ON comments;
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON comment_likes;
DROP POLICY IF EXISTS "Anyone can like" ON comment_likes;
DROP POLICY IF EXISTS "Anyone can unlike" ON comment_likes;
DROP POLICY IF EXISTS "Market data is viewable by everyone" ON market_data;
DROP POLICY IF EXISTS "Anyone can insert market data" ON market_data;
DROP POLICY IF EXISTS "Anyone can update market data" ON market_data;
DROP POLICY IF EXISTS "Activity is viewable by everyone" ON activity;
DROP POLICY IF EXISTS "Anyone can create activity" ON activity;

-- Create policies
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (true);

CREATE POLICY "Comments are viewable by everyone" ON comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert comments" ON comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update comments" ON comments FOR UPDATE USING (true);

CREATE POLICY "Likes are viewable by everyone" ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can like" ON comment_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can unlike" ON comment_likes FOR DELETE USING (true);

CREATE POLICY "Market data is viewable by everyone" ON market_data FOR SELECT USING (true);
CREATE POLICY "Anyone can insert market data" ON market_data FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update market data" ON market_data FOR UPDATE USING (true);

CREATE POLICY "Activity is viewable by everyone" ON activity FOR SELECT USING (true);
CREATE POLICY "Anyone can create activity" ON activity FOR INSERT WITH CHECK (true);

-- Achievements System
CREATE TABLE IF NOT EXISTS achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL, -- e.g. 'MARKET_CREATOR'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  xp INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL REFERENCES profiles(wallet_address),
  achievement_code TEXT REFERENCES achievements(code),
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_wallet, achievement_code)
);

-- Policies for Achievements
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Achievements viewable by everyone" ON achievements FOR SELECT USING (true);

ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User achievements viewable by everyone" ON user_achievements FOR SELECT USING (true);
CREATE POLICY "Public insert for user achievements" ON user_achievements FOR INSERT WITH CHECK (true);

-- Seed initial achievements (Tiered System)
INSERT INTO achievements (code, name, description, image_url, xp)
VALUES 
-- 🥉 BRONZE (Easy)
('FIRST_MARKET', 'Market Maker', 'Created your first prediction market', '/badges/first-market.png', 50),
('FIRST_BET', 'Skin in the Game', 'Placed your first bet', '/badges/first-bet.png', 30),
('FIRST_WIN', 'First Blood', 'Won your first prediction bet', '/badges/first-win.png', 50),
('COMMENTATOR', 'Voice of the Crowd', 'Left your first comment', '/badges/commentator.png', 20),
-- 🥈 SILVER (Medium)
('WHALE', 'Whale Alert', 'Placed a bet of $1,000 or more', '/badges/whale.png', 100),
('MARKET_5', 'Serial Creator', 'Created 5 prediction markets', '/badges/market-5.png', 150),
('WIN_3', 'Hat Trick', 'Won 3 predictions', '/badges/win-3.png', 100),
-- 🥇 GOLD (Hard)
('MARKET_10', 'Factory Owner', 'Created 10 prediction markets', '/badges/market-10.png', 300),
('WIN_STREAK_3', 'Prophet', 'Won 3 predictions in a row', '/badges/prophet.png', 250),
-- 💎 LEGENDARY (Very Hard)
('MARKET_25', 'Djinn Master', 'Created 25 prediction markets', '/badges/djinn-master.png', 500),
('WIN_STREAK_5', 'Oracle', 'Won 5 predictions in a row', '/badges/oracle.png', 500)
ON CONFLICT (code) DO NOTHING;
