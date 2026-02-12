-- ============================================
-- DJINN REFERRAL SYSTEM - SUPABASE MIGRATION
-- ============================================

-- 1. Add new columns to profiles table (if not exist)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS user_number INTEGER,
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'WAITLIST',
ADD COLUMN IF NOT EXISTS has_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_genesis_gem BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- Create index on user_number for fast lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_number ON profiles(user_number);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- 2. Create referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referrer_username TEXT NOT NULL,
  new_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  new_user_wallet TEXT NOT NULL,
  is_valid BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for referrals
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_new_user ON referrals(new_user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_referrals_unique_user ON referrals(new_user_id);

-- 3. Create system_stats table
CREATE TABLE IF NOT EXISTS system_stats (
  id TEXT PRIMARY KEY DEFAULT 'main',
  total_users INTEGER DEFAULT 0,
  total_access_granted INTEGER DEFAULT 0,
  founders_count INTEGER DEFAULT 0,
  referral_access_count INTEGER DEFAULT 0,
  waitlist_count INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial stats row
INSERT INTO system_stats (id) VALUES ('main')
ON CONFLICT (id) DO NOTHING;

-- 4. Create share_events table
CREATE TABLE IF NOT EXISTS share_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform TEXT DEFAULT 'twitter',
  shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_share_events_user ON share_events(user_id);

-- 5. FUNCTION: Set Tier on Signup
-- Handles Tier 1 (Founders) vs Tier 2 (Referral) vs Tier 3 (Waitlist)
CREATE OR REPLACE FUNCTION set_user_tiered_status()
RETURNS TRIGGER AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Get total profiles count
  SELECT COUNT(*) INTO current_count FROM profiles;
  
  -- Assign User Number
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

  -- Generate referral code
  NEW.referral_code := LOWER(NEW.username) || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_tier ON profiles;
CREATE TRIGGER trigger_set_tier
  BEFORE INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_user_tiered_status();

-- 6. FUNCTION: Update system stats automatically
CREATE OR REPLACE FUNCTION update_system_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE system_stats
  SET 
    total_users = (SELECT COUNT(*) FROM profiles),
    total_access_granted = (SELECT COUNT(*) FROM profiles WHERE has_access = true),
    founders_count = (SELECT COUNT(*) FROM profiles WHERE tier = 'FOUNDER'),
    referral_access_count = (SELECT COUNT(*) FROM profiles WHERE tier = 'REFERRAL' AND has_access = true),
    waitlist_count = (SELECT COUNT(*) FROM profiles WHERE tier = 'WAITLIST'),
    last_updated = NOW()
  WHERE id = 'main';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_stats ON profiles;
CREATE TRIGGER trigger_update_stats
  AFTER INSERT OR UPDATE ON profiles
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_system_stats();

-- 7. FUNCTION: Grant Access after 3 referrals
CREATE OR REPLACE FUNCTION check_referral_access()
RETURNS TRIGGER AS $$
DECLARE
  referral_count INTEGER;
  total_access INTEGER;
BEGIN
  -- Count valid referrals for the referrer
  SELECT COUNT(*) INTO referral_count
  FROM referrals
  WHERE referrer_id = NEW.referrer_id AND is_valid = true;
  
  -- Check total access count
  SELECT total_access_granted INTO total_access
  FROM system_stats
  WHERE id = 'main';
  
  -- If user has 3+ referrals and global access count < 2000, grant access
  IF referral_count >= 3 AND total_access < 2000 THEN
    UPDATE profiles
    SET has_access = true
    WHERE id = NEW.referrer_id AND has_access = false;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_check_referral_access ON referrals;
CREATE TRIGGER trigger_check_referral_access
  AFTER INSERT ON referrals
  FOR EACH ROW
  EXECUTE FUNCTION check_referral_access();

-- 8. Row Level Security (RLS)
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE share_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

CREATE POLICY "Public insert referrals"
  ON referrals FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own share events"
  ON share_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create share events"
  ON share_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RELOAD CACHE
NOTIFY pgrst, 'reload schema';
