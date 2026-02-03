-- Force release the username "Lord" (case-insensitive check)
-- This updates ONLY the specific row that has "Lord" as username
-- setting it back to its wallet address.

UPDATE profiles
SET username = wallet_address
WHERE username ILIKE 'Lord';
