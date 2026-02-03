-- Reset all usernames to their wallet address
-- This frees up "lord" and other custom names while satisfying NOT NULL constraints
-- and ensuring uniqueness.

UPDATE profiles
SET username = wallet_address;
