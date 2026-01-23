-- ============================================
-- DJINN MARKETS - SCHEMA V2 MIGRATION
-- Adds missing columns for Live Market Feed
-- Run this in Supabase SQL Editor
-- ============================================

-- Add missing columns to markets table
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'Trending',
  ADD COLUMN IF NOT EXISTS market_pda TEXT,
  ADD COLUMN IF NOT EXISTS yes_token_mint TEXT,
  ADD COLUMN IF NOT EXISTS no_token_mint TEXT,
  ADD COLUMN IF NOT EXISTS resolution_source TEXT DEFAULT 'DERIVED',
  ADD COLUMN IF NOT EXISTS options JSONB,
  ADD COLUMN IF NOT EXISTS tx_signature TEXT,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE;

-- Performance indexes for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_markets_archived ON markets(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_markets_category_created ON markets(category, created_at DESC);

-- Ensure RLS policies are set for markets table
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Markets viewable by everyone" ON markets;
DROP POLICY IF EXISTS "Anyone can create markets" ON markets;
DROP POLICY IF EXISTS "Anyone can update markets" ON markets;

-- Create policies for public access
CREATE POLICY "Markets viewable by everyone" ON markets FOR SELECT USING (true);
CREATE POLICY "Anyone can create markets" ON markets FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update markets" ON markets FOR UPDATE USING (true);

-- Verify migration success
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'markets'
ORDER BY ordinal_position;
