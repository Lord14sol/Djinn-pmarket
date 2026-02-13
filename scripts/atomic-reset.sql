-- ============================================
-- DJINN MARKETS - ATOMIC DATABASE RESET
-- Run this in your Supabase SQL Editor for a clean slate
-- ============================================

-- 1. Wipe all activity/trade data
TRUNCATE TABLE public.activity CASCADE;
TRUNCATE TABLE public.bets CASCADE;
TRUNCATE TABLE public.comments CASCADE;
TRUNCATE TABLE public.comment_likes CASCADE;
TRUNCATE TABLE public.notifications CASCADE;
TRUNCATE TABLE public.user_achievements CASCADE;
TRUNCATE TABLE public.follows CASCADE;

-- 2. Clear profiles except Lord
DELETE FROM public.profiles 
WHERE wallet_address != 'C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X';

-- 3. Reset Whitelist except Lord
DELETE FROM public.genesis_whitelist 
WHERE wallet_address != 'C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X';

-- 4. Reload PostgREST Cache
NOTIFY pgrst, 'reload schema';
