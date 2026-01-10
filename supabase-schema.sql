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
