-- ============================================
-- SEED MARKETS (DEMO DATA)
-- Run this in Supabase SQL Editor
-- ============================================

-- Use Treasury Wallet as Creator
-- CHANGE wallet address if you want to belong to a specific user
INSERT INTO public.markets (slug, title, description, banner_url, creator_wallet, end_date, resolved, total_yes_pool, total_no_pool, created_at)
VALUES 
-- 1. Argentina World Cup
('argentina-world-cup-2026', 'Will Argentina be finalist on the FIFA World Cup 2026?', 'Se resuelve YES si Argentina juega la final.', '/banners/argentina.jpg', 'G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma', '2026-07-19 00:00:00+00', FALSE, 150000, 120000, NOW()),

-- 2. BTC ATH
('btc-hit-150k', 'Will Bitcoin reach ATH on 2026?', 'Resolves YES if BTC breaks its previous record of ~$100k (simulated).', '/banners/btc.jpg', 'G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma', '2026-12-31 23:59:59+00', FALSE, 500000, 450000, NOW()),

-- 3. US Strike Mexico
('us-strike-mexico', 'US strike on Mexico by...?', 'Predicting geopolitical events regarding US-Mexico relations.', '/banners/us-mexico.jpg', 'G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma', '2026-03-31 00:00:00+00', FALSE, 80000, 20000, NOW()),

-- 4. World Cup Winner
('world-cup-winner-multiple', 'Who will win the World Cup 2026?', 'Predict which country will lift the trophy in the FIFA World Cup 2026.', '/banners/worldcup.jpg', 'G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma', '2026-07-19 00:00:00+00', FALSE, 250000, 250000, NOW())
ON CONFLICT (slug) DO NOTHING;
