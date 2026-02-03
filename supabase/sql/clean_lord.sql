-- 1. DIAGNOSE: See who has "Lord" (or close variants)
SELECT id, username, wallet_address FROM profiles WHERE username ILIKE '%Lord%';

-- 2. RESET: Force reset ANY username containing "Lord" (case-insensitive) to its wallet address
UPDATE profiles 
SET username = wallet_address 
WHERE username ILIKE '%Lord%';

-- 3. VERIFY: Confirm no one has it anymore
SELECT id, username, wallet_address FROM profiles WHERE username ILIKE '%Lord%';
