# 🗂️ MIGRACIÓN COMPLETA A SUPABASE

**Objetivo:** Eliminar TODO uso de localStorage y migrar a Supabase 100%

**Tiempo estimado:** 1-2 horas
**Costo:** $0 USD (Free tier)
**Dificultad:** ⭐⭐ (Media)

---

## 📋 CHECKLIST PRE-MIGRACIÓN

Antes de empezar, verifica que tienes:

- [ ] Cuenta Supabase activa
- [ ] Project creado en Supabase
- [ ] `.env.local` con SUPABASE_URL y SUPABASE_ANON_KEY
- [ ] Tablas creadas (markets, activity, users, oracle_*)

---

## 🔍 PASO 1: IDENTIFICAR TODO CÓDIGO LOCALSTORAGE

Busca en tu proyecto:

```bash
cd /Users/benjaminfuentes/Djinn-pmarket
grep -r "localStorage" --include="*.tsx" --include="*.ts" .
```

**Archivos que usan localStorage:**
1. `app/page.tsx` (líneas 226-296) - Market loading/saving
2. Posiblemente en otros componentes

---

## ✂️ PASO 2: ELIMINAR LOCALSTORAGE DE app/page.tsx

### **2.1 BORRAR estas líneas:**

```typescript
// DELETE FROM app/page.tsx

// Lines ~226-230 (localStorage check)
const createdMarkets = localStorage.getItem('djinn_created_markets');
let localMarkets = [];
if (createdMarkets) {
  localMarkets = JSON.parse(createdMarkets);
}

// Lines ~235-240 (dedupe logic)
const pdaSet = new Set(finalMarkets.map(m => m.marketPDA));
const slugSet = new Set(finalMarkets.map(m => m.slug));
const uniqueLocal = localMarkets.filter((m: any) =>
  !pdaSet.has(m.marketPDA) && !slugSet.has(m.slug)
);

// Lines ~260-275 (fallback localStorage)
try {
  const createdMarkets = localStorage.getItem('djinn_created_markets');
  let customMarkets = [];
  if (createdMarkets) customMarkets = JSON.parse(createdMarkets);
  // ...
} catch (localError) {
  console.error("Error with localStorage fallback:", localError);
}

// Lines ~309-316 (save to localStorage)
try {
  const savedMarkets = JSON.parse(localStorage.getItem('djinn_markets') || '[]');
  const updatedSaved = [marketWithTimestamp, ...savedMarkets];
  localStorage.setItem('djinn_markets', JSON.stringify(updatedSaved));
} catch (error) {
  console.error("LocalStorage is full!", error);
}

// Lines ~289-290 (storage event listener)
window.addEventListener('storage', loadMarkets);
```

### **2.2 REEMPLAZAR con código Supabase-only:**

```typescript
// REPLACE IN app/page.tsx

// New loadMarkets function (simplified)
const loadMarkets = async () => {
  try {
    // 1. Fetch ALL markets from Supabase
    const supabaseMarkets = await getSupabaseMarkets();

    if (!supabaseMarkets || supabaseMarkets.length === 0) {
      // Fallback to static markets ONLY if DB is empty
      console.log('ℹ️ No markets in DB, showing defaults');
      setMarkets(initialStaticMarkets);
    } else {
      // 2. Format Supabase markets
      const formatted = supabaseMarkets.map((m, index) => ({
        id: m.id || `sb-${index}`,
        title: m.title,
        chance: Math.round((m.total_yes_pool / (m.total_yes_pool + m.total_no_pool + 1)) * 100) || 50,
        volume: `$${formatCompact(m.total_yes_pool + m.total_no_pool)}`,
        type: 'binary',
        category: (m as any).category || 'Trending',
        endDate: m.end_date ? new Date(m.end_date) : new Date('2026-12-31'),
        slug: m.slug,
        createdAt: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
        resolved: m.resolved,
        winningOutcome: m.winning_outcome,
        marketPDA: m.market_pda,
        yesTokenMint: m.yes_token_mint,
        noTokenMint: m.no_token_mint,
        resolutionSource: m.resolution_source
      }));

      // 3. Append static markets for demo purposes
      const existIds = new Set(formatted.map(m => m.id));
      const uniqueStatic = initialStaticMarkets.filter(m => !existIds.has(m.id));
      setMarkets([...formatted, ...uniqueStatic]);
    }

    console.log(`✅ Loaded ${supabaseMarkets?.length || 0} markets from Supabase`);
  } catch (e) {
    console.error("Error loading markets from Supabase:", e);
    // Ultimate fallback: static markets
    setMarkets(initialStaticMarkets);
  } finally {
    setTimeout(() => setIsLoading(false), 300);
  }
};

// New handleCreateMarket (no localStorage)
const handleCreateMarket = async (newMarket: any) => {
  const marketWithTimestamp = {
    ...newMarket,
    createdAt: newMarket.createdAt || Date.now(),
    category: newMarket.category || 'Trending'
  };

  // Optimistic UI update
  setMarkets(prev => [marketWithTimestamp, ...prev]);

  // Save to Supabase (happens in CreateMarketModal via supabase-db.ts)
  // No need to duplicate save here
};
```

### **2.3 UPDATE useEffect:**

```typescript
useEffect(() => {
  loadMarkets();

  // Listen for new markets (custom event from CreateMarketModal)
  const handleMarketCreated = (event: any) => {
    if (event.detail) {
      console.log("⚡ New market created:", event.detail);
      loadMarkets(); // Reload from Supabase
    }
  };

  window.addEventListener('market-created', handleMarketCreated);

  return () => {
    window.removeEventListener('market-created', handleMarketCreated);
  };
}, []);
```

---

## 🗄️ PASO 3: VERIFICAR SUPABASE SCHEMA

Asegúrate que tu tabla `markets` tiene estas columnas:

```sql
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS markets (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  market_pda TEXT,
  yes_token_mint TEXT,
  no_token_mint TEXT,
  creator_wallet TEXT,
  total_yes_pool DECIMAL DEFAULT 0,
  total_no_pool DECIMAL DEFAULT 0,
  resolved BOOLEAN DEFAULT false,
  winning_outcome TEXT,
  resolution_source TEXT,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT DEFAULT 'Trending'
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_markets_slug ON markets(slug);
CREATE INDEX IF NOT EXISTS idx_markets_created_at ON markets(created_at DESC);
```

---

## 🧪 PASO 4: TESTING

### **4.1 Test 1: Load markets from DB**

```bash
npm run dev
# Open http://localhost:3000
# Check console: Should see "✅ Loaded X markets from Supabase"
```

### **4.2 Test 2: Create new market**

1. Click "Create Market"
2. Fill form & submit
3. Check Supabase dashboard → `markets` table → verify row inserted
4. Refresh page → market should persist

### **4.3 Test 3: Clear localStorage (verify migration)**

```javascript
// In browser console
localStorage.clear();
location.reload();
// Markets should still load from Supabase ✅
```

---

## 🔄 PASO 5: REALTIME UPDATES (Optional pero recomendado)

Para que markets se actualicen en tiempo real sin refresh:

```typescript
// Add to app/page.tsx useEffect

useEffect(() => {
  loadMarkets();

  // Subscribe to realtime changes
  const channel = supabase
    .channel('markets-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'markets' },
      (payload) => {
        console.log('🔄 Market changed:', payload);
        loadMarkets(); // Reload when ANY market changes
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);
```

---

## ✅ PASO 6: CLEANUP & VERIFICATION

### **6.1 Remove todos los archivos localStorage:**

```bash
# Busca y verifica que NO quede ningún localStorage
grep -r "localStorage" app/ components/ lib/

# Si encuentras alguno, elimínalo
```

### **6.2 Verifica Supabase usage:**

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/billing
2. Check "Database size": Should be < 10 MB (well within free tier)
3. Check "Bandwidth": Should be < 100 MB/month

### **6.3 Update README:**

```markdown
## Database

Djinn uses Supabase (PostgreSQL) for all data:
- Markets
- Trades/Activity
- User profiles
- Oracle data

No localStorage - everything syncs across devices.
```

---

## 🎉 RESULTADO FINAL

Después de migración:

✅ **Todo en Supabase** (no localStorage)
✅ **Realtime sync** entre users
✅ **No se pierde data** si clear cache
✅ **Cross-device sync** (desktop + mobile)
✅ **Backups automáticos** (Supabase)
✅ **$0 USD cost** (free tier)

---

## 🆘 TROUBLESHOOTING

### **Error: "relation 'markets' does not exist"**

**Fix:** Run SQL schema creation (Paso 3)

### **Error: "Invalid API key"**

**Fix:** Check `.env.local` has correct SUPABASE_URL and ANON_KEY

### **Error: "Row-level security policy"**

**Fix:** Disable RLS for markets table (or create policy):

```sql
ALTER TABLE markets DISABLE ROW LEVEL SECURITY;
```

### **Markets not updating in realtime**

**Fix:** Verify realtime is enabled in Supabase dashboard:
1. Go to Database → Replication
2. Enable replication for `markets` table

---

## 📊 MIGRATION CHECKLIST

- [ ] Backup localStorage data (if any users have important data)
- [ ] Delete all localStorage code from app/page.tsx
- [ ] Verify Supabase schema exists
- [ ] Test market loading from DB
- [ ] Test market creation to DB
- [ ] Test realtime updates (optional)
- [ ] Verify no localStorage code remains
- [ ] Update documentation

---

**Tiempo total:** 1-2 horas
**Riesgo:** BAJO (no breaking changes for users)
**Beneficio:** ALTO (mejor UX + scalability)

¿Listo para migrar? Hazlo YA. 🚀
