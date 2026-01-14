-- 1. Create Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
    code text PRIMARY KEY,
    name text NOT NULL,
    description text,
    image_url text,
    xp integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_wallet text NOT NULL,
    achievement_code text REFERENCES public.achievements(code),
    earned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_wallet, achievement_code)
);

-- 3. Enable Security (RLS)
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Service role write access" ON public.user_achievements FOR INSERT WITH CHECK (true);
