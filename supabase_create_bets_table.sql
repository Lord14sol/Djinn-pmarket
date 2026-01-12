-- ============================================
-- CREAR TABLA BETS (APUESTAS)
-- Ejecutar en Supabase SQL Editor
-- ============================================

CREATE TABLE IF NOT EXISTS public.bets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    market_slug TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    side TEXT NOT NULL CHECK (side IN ('YES', 'NO')),
    amount NUMERIC NOT NULL DEFAULT 0,
    sol_amount NUMERIC NOT NULL DEFAULT 0,
    shares NUMERIC NOT NULL DEFAULT 0,
    entry_price NUMERIC NOT NULL DEFAULT 50,
    payout NUMERIC DEFAULT NULL,
    claimed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_bets_wallet ON public.bets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_bets_market ON public.bets(market_slug);
CREATE INDEX IF NOT EXISTS idx_bets_claimed ON public.bets(claimed);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.bets ENABLE ROW LEVEL SECURITY;

-- Política: Cualquiera puede leer bets
CREATE POLICY "Allow public read" ON public.bets
    FOR SELECT USING (true);

-- Política: Usuarios autenticados pueden insertar sus propias bets
CREATE POLICY "Allow insert own bets" ON public.bets
    FOR INSERT WITH CHECK (true);

-- Política: Usuarios pueden actualizar sus propias bets
CREATE POLICY "Allow update own bets" ON public.bets
    FOR UPDATE USING (true);

-- ============================================
-- TAMBIÉN CREAR TABLAS FALTANTES
-- ============================================

-- Tabla user_achievements (si no existe)
CREATE TABLE IF NOT EXISTS public.user_achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    achievement_code TEXT NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(wallet_address, achievement_code)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read achievements" ON public.user_achievements FOR SELECT USING (true);
CREATE POLICY "Allow insert achievements" ON public.user_achievements FOR INSERT WITH CHECK (true);

-- Tabla achievements (catálogo)
CREATE TABLE IF NOT EXISTS public.achievements (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    xp INTEGER DEFAULT 0
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read achievements catalog" ON public.achievements FOR SELECT USING (true);

-- Insertar achievements por defecto
INSERT INTO public.achievements (code, name, description, image_url, xp) VALUES
    ('FIRST_BET', 'First Blood', 'Placed your first bet', '🎯', 100),
    ('MARKET_CREATOR', 'Market Maker', 'Created your first market', '🏗️', 200),
    ('WHALE', 'Whale', 'Bet over $1000 in a single trade', '🐋', 500),
    ('FIRST_WIN', 'Winner Winner', 'Won your first bet', '🏆', 150)
ON CONFLICT (code) DO NOTHING;

COMMIT;
