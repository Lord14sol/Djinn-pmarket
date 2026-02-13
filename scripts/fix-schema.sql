-- ============================================
-- DJINN MARKETS - NUCLEAR SCHEMA RESTORATION
-- Run this in your Supabase SQL Editor to fix PGRST200 errors
-- ============================================

-- 1. FIX FOLLOWS TABLE (Nuclear)
DROP TABLE IF EXISTS public.follows CASCADE;
CREATE TABLE public.follows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
    target TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(follower, target)
);
CREATE INDEX idx_follows_follower ON public.follows(follower);
CREATE INDEX idx_follows_target ON public.follows(target);

-- 2. FIX ACHIEVEMENTS SYSTEM (Nuclear)
-- Drop linking table first
DROP TABLE IF EXISTS public.user_achievements CASCADE;
-- Drop achievements table
DROP TABLE IF EXISTS public.achievements CASCADE;

-- Create achievements table
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  xp INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_achievements (linking table)
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_wallet TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
  achievement_code TEXT NOT NULL REFERENCES public.achievements(code) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_wallet, achievement_code)
);

-- Seed achievements again
INSERT INTO public.achievements (code, name, description, image_url, xp)
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

-- 3. NOTIFICATIONS TABLE (Nuclear)
DROP TABLE IF EXISTS public.notifications CASCADE;
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_wallet TEXT NOT NULL REFERENCES public.profiles(wallet_address) ON DELETE CASCADE,
    type TEXT NOT NULL,
    from_wallet TEXT REFERENCES public.profiles(wallet_address) ON DELETE SET NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON public.notifications(user_wallet);

-- 4. POLICIES (RLS)
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Public insert follows" ON public.follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Public delete follows" ON public.follows FOR DELETE USING (true);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select achievements" ON public.achievements FOR SELECT USING (true);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select user_achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Public insert user_achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public select notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "Public insert notifications" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update notifications" ON public.notifications FOR UPDATE USING (true);

-- RELOAD CACHE
NOTIFY pgrst, 'reload schema';
