-- ============================================
-- GEMS & FOLLOWS SYSTEM
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. FOLLOWS TABLE
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_wallet TEXT NOT NULL, 
  following_wallet TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_wallet, following_wallet)
);

-- RLS for Follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Follows viewable by everyone" ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (true);

-- 2. GEMS COLUMN
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gems NUMERIC DEFAULT 0;

-- 3. ADD_GEMS RPC
-- Secure function to add gems (callable from server or client depending on RLS/RPC settings)
CREATE OR REPLACE FUNCTION add_gems(user_wallet TEXT, amount_to_add NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET gems = COALESCE(gems, 0) + amount_to_add 
  WHERE wallet_address = user_wallet;
END;
$$ LANGUAGE plpgsql;

-- 4. RESET GEMS (Optional Utility)
CREATE OR REPLACE FUNCTION reset_all_gems()
RETURNS void AS $$
BEGIN
  UPDATE profiles SET gems = 0;
END;
$$ LANGUAGE plpgsql;
