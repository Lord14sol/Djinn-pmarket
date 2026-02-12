-- ============================================
-- REPAIR & RESET TIERED ACCESS
-- ============================================

-- 1. Ensure columns have correct types
ALTER TABLE profiles 
ALTER COLUMN tier SET DEFAULT 'WAITLIST',
ALTER COLUMN has_access SET DEFAULT false,
ALTER COLUMN has_genesis_gem SET DEFAULT false;

-- 2. RE-CREATE FUNCTION with Debugging
CREATE OR REPLACE FUNCTION set_user_tiered_status()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get total profiles count
  SELECT COUNT(*) INTO current_count FROM profiles;
  
  -- Debug Notice (visible in Supabase Logs)
  RAISE NOTICE 'Djinn: Assigning tier for user %. Current total: %', NEW.username, current_count;
  
  -- Assign User Number (Sequential)
  NEW.user_number := current_count + 1;
  
  -- TIER 1: FOUNDERS (1-1000)
  IF NEW.user_number <= 1000 THEN
    NEW.tier := 'FOUNDER';
    NEW.has_access := true;
    NEW.has_genesis_gem := true;
  -- TIER 2: REFERRAL (1001-2000)
  ELSIF NEW.user_number <= 2000 THEN
    NEW.tier := 'REFERRAL';
    NEW.has_access := false;
    NEW.has_genesis_gem := true;
  -- TIER 3: WAITLIST (2001+)
  ELSE
    NEW.tier := 'WAITLIST';
    NEW.has_access := false;
    NEW.has_genesis_gem := false;
  END IF;

  -- Generate referral code if missing
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := LOWER(COALESCE(NEW.username, 'user')) || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RE-CREATE TRIGGER
DROP TRIGGER IF EXISTS trigger_set_tier ON profiles;
CREATE TRIGGER trigger_set_tier
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tiered_status();

-- 4. BACKFILL EXISTING PROFILES
-- Assign user numbers and tiers to anyone who is missing them
DO $$
DECLARE
    r RECORD;
    i INTEGER := 1;
BEGIN
    FOR r IN (SELECT id FROM profiles WHERE user_number IS NULL ORDER BY created_at ASC) LOOP
        UPDATE profiles SET 
          user_number = i,
          tier = CASE 
            WHEN i <= 1000 THEN 'FOUNDER' 
            WHEN i <= 2000 THEN 'REFERRAL' 
            ELSE 'WAITLIST' 
          END,
          has_access = (i <= 1000),
          has_genesis_gem = (i <= 2000),
          referral_code = LOWER(username) || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)
        WHERE id = r.id;
        i := i + 1;
    END LOOP;
END $$;

-- 5. RE-SYNC SYSTEM STATS
UPDATE system_stats
SET 
  total_users = (SELECT COUNT(*) FROM profiles),
  total_access_granted = (SELECT COUNT(*) FROM profiles WHERE has_access = true),
  founders_count = (SELECT COUNT(*) FROM profiles WHERE tier = 'FOUNDER'),
  referral_access_count = (SELECT COUNT(*) FROM profiles WHERE tier = 'REFERRAL' AND has_access = true),
  waitlist_count = (SELECT COUNT(*) FROM profiles WHERE tier = 'WAITLIST'),
  last_updated = NOW()
WHERE id = 'main';

-- VERIFY
SELECT username, user_number, tier, has_access FROM profiles ORDER BY user_number ASC;
