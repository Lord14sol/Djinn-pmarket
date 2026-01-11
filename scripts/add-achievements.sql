-- Run this in Supabase SQL Editor to add new achievements
-- This is safe to run multiple times (ON CONFLICT DO NOTHING)

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
