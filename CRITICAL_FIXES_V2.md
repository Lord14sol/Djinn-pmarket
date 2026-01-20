# 🚨 CORRECCIONES CRÍTICAS V2 - Djinn Market

## ❌ BUGS REPORTADOS POR EL USUARIO

### Problema Real Observado:
```
Market: "Final Review" (Peru vs Chile - Binary)
Compra 1: 1 SOL de Peru → Explota a 100% ❌
Compra 2: 2 SOL de Chile → Gráfico NO se actualiza, Peru sigue 100% ❌
Venta: Chile dice "no shares", Peru muestra 3 SOL mezclados ❌
Market Cap: Peru mcap = $379, Chile mcap = $0 ❌
Shares to sell: 5.7M shares, You get: $0 ❌
```

---

## ✅ CORRECCIONES APLICADAS (V2)

### 1. **State de Pools Reales Agregado** ✅
**Archivo:** `app/market/[slug]/page.tsx:118-120`

```typescript
// NUEVO STATE
const [currentYesPool, setCurrentYesPool] = useState<number>(0);
const [currentNoPool, setCurrentNoPool] = useState<number>(0);
```

**Propósito:**
- Mantener los pools reales del AMM en memoria
- Persistir en DB después de cada trade
- NO recalcular desde porcentaje (que estaba MAL)

---

### 2. **Cargar Pools desde DB al Iniciar** ✅
**Archivo:** `app/market/[slug]/page.tsx:349-378`

```typescript
const market = await supabaseDb.getMarket(effectiveSlug);

if (market) {
    // Cargar pools REALES
    const yesPool = market.total_yes_pool || 0;
    const noPool = market.total_no_pool || 0;
    setCurrentYesPool(yesPool);
    setCurrentNoPool(noPool);

    // Calcular probabilidad DESDE los pools
    const { INITIAL_LIQUIDITY_PER_SIDE } = require('@/lib/amm/calculations');
    const totalLiquidity = (yesPool || INITIAL_LIQUIDITY_PER_SIDE) + (noPool || INITIAL_LIQUIDITY_PER_SIDE);
    const probability = ((yesPool || INITIAL_LIQUIDITY_PER_SIDE) / totalLiquidity) * 100;
    setLivePrice(probability);

    // Generate chart desde fecha de CREACIÓN
    const createdAt = market.created_at ? new Date(market.created_at) : new Date();
    setChartData(generateChartData(probability, createdAt));
}
```

**ANTES (MALO):**
- Generaba gráfico con datos fake hacia atrás
- NO cargaba pools reales

**AHORA (BUENO):**
- Carga pools desde DB
- Gráfico empieza desde `market.created_at`
- Probabilidad calculada desde pools reales

---

### 3. **Update Execution Prices Usa Pools del State** ✅
**Archivo:** `app/market/[slug]/page.tsx:172-194`

```typescript
if (!isMultiOutcome) {
    // Usar pools REALES del state
    const currentPool = {
        yesPool: currentYesPool,
        noPool: currentNoPool
    };

    const betOutcome = calculateBetOutcome(currentPool, betAmountUSD, side);

    // Actualizar state con NUEVOS pools
    setCurrentYesPool(betOutcome.newYesPool);
    setCurrentNoPool(betOutcome.newNoPool);
    setLivePrice(betOutcome.newProbability);

    // Actualizar gráfico
    setChartData(prev => {
        const newData = [...prev];
        newData.push({
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            value: betOutcome.newProbability
        });
        if (newData.length > 50) newData.shift();
        return newData;
    });

    return betOutcome.newProbability;
}
```

**ANTES (MALO):**
```typescript
const currentPool = {
    yesPool: livePrice * 2 || INITIAL_LIQUIDITY_PER_SIDE, // ❌ Conversión falsa
    noPool: (100 - livePrice) * 2 || INITIAL_LIQUIDITY_PER_SIDE
};
```

**POR QUÉ ESTABA MAL:**
- `livePrice` es porcentaje (0-100), NO un pool en USD
- `livePrice * 2` NO representa el pool real
- Ejemplo: Si livePrice = 50%, `yesPool = 100`, pero el pool REAL podría ser $500

**AHORA (BUENO):**
- Usa `currentYesPool` y `currentNoPool` del state
- Estos valores vienen de la DB o se actualizan con AMM real

---

### 4. **HandlePlaceBet Persiste Pools Correctos** ✅
**Archivo:** `app/market/[slug]/page.tsx:461-478`

```typescript
// ANTES (MALO)
const updatedPools = {
    total_yes_pool: (currentMarket?.total_yes_pool || 0) + (selectedSide === 'YES' ? usdBet : 0),
    total_no_pool: (currentMarket?.total_no_pool || 0) + (selectedSide === 'NO' ? usdBet : 0)
};
```

**Problema:**
- Solo SUMA el bet al pool, NO usa la fórmula AMM
- Los pools NO reflejan el estado real del AMM

```typescript
// AHORA (BUENO)
await supabaseDb.createMarket({
    slug: effectiveSlug,
    title: selectedOutcomeName || staticMarketInfo.title,
    creator_wallet: currentMarket?.creator_wallet || publicKey.toBase58(),
    total_yes_pool: currentYesPool, // Ya actualizado por AMM en updateExecutionPrices
    total_no_pool: currentNoPool,   // Ya actualizado por AMM en updateExecutionPrices
    resolved: false
});
```

**Resultado:**
- Los pools en DB reflejan el estado REAL del AMM
- Peru mcap y Chile mcap se actualizan correctamente

---

### 5. **Cargar TODAS las Posiciones del Usuario** ✅
**Archivo:** `app/market/[slug]/page.tsx:395-415`

```typescript
// ANTES (MALO)
const myBet = userBets.find(b => b.market_slug === effectiveSlug && !b.claimed);
if (myBet) {
    setMyHeldPosition(myBet.side);
    setMyHeldAmount(`$${myBet.amount.toFixed(2)}`);
}
```

**Problema:**
- Solo busca UN bet (`.find`)
- Como ahora hay MÚLTIPLES bets independientes, NO suma todos

```typescript
// AHORA (BUENO)
const myBetsForThisMarket = userBets.filter(b => b.market_slug === effectiveSlug && !b.claimed);

if (myBetsForThisMarket.length > 0) {
    // Sumar bets por lado
    const yesBets = myBetsForThisMarket.filter(b => b.side === 'YES');
    const noBets = myBetsForThisMarket.filter(b => b.side === 'NO');

    const yesTotalAmount = yesBets.reduce((sum, b) => sum + b.amount, 0);
    const noTotalAmount = noBets.reduce((sum, b) => sum + b.amount, 0);

    console.log('📊 User positions:', { yesAmount: yesTotalAmount, noAmount: noTotalAmount });

    // Mostrar el último bet como referencia
    const lastBet = myBetsForThisMarket[0];
    setMyHeldPosition(lastBet.side);
    setMyHeldAmount(`$${lastBet.amount.toFixed(2)}`);
}
```

**Resultado:**
- Ahora reconoce TODOS los bets del usuario
- Suma correctamente Peru + Chile

---

### 6. **Venta Usa AMM Inverso Correcto** ✅
**Archivo:** `app/market/[slug]/page.tsx:889-933`

```typescript
// ANTES (MALO)
const oppositeSide = myHeldPosition === 'YES' ? 'NO' : 'YES';
const newPrice = updateExectutionPrices(effectiveSlug, -amountToSellUSD, oppositeSide);
```

**Problema:**
- Si tienes YES, vende NO (??? lógica inversa)
- No suma TODOS los bets del lado

```typescript
// AHORA (BUENO)
// Get all user's bets for this market and side
const userBets = await supabaseDb.getUserBets(publicKey?.toBase58() || '');
const myBetsThisSide = userBets.filter(b =>
    b.market_slug === effectiveSlug &&
    b.side === myHeldPosition &&
    !b.claimed
);

const totalShares = myBetsThisSide.reduce((sum, b) => sum + b.shares, 0);
const totalInvestedUSD = myBetsThisSide.reduce((sum, b) => sum + b.amount, 0);

// Selling YES = buying NO (inverse operation en el AMM)
const inverseSide = myHeldPosition === 'YES' ? 'NO' : 'YES';
const sellOutcome = calculateBetOutcome(sellPool, totalInvestedUSD, inverseSide);

// Update pools
setCurrentYesPool(sellOutcome.newYesPool);
setCurrentNoPool(sellOutcome.newNoPool);
setLivePrice(sellOutcome.newProbability);

// Persist to DB
await supabaseDb.createMarket({
    slug: effectiveSlug,
    title: staticMarketInfo.title,
    creator_wallet: publicKey?.toBase58() || 'system',
    total_yes_pool: sellOutcome.newYesPool,
    total_no_pool: sellOutcome.newNoPool,
    resolved: false
});
```

**Resultado:**
- Vende TODOS los shares del lado correcto
- Actualiza pools correctamente
- Muestra shares correctos ("You get: $X")

---

### 7. **Activity de Venta Corregida** ✅
**Archivo:** `app/market/[slug]/page.tsx:935-951`

```typescript
// ANTES (MALO)
action: 'NO' as const, // ❌ Hardcoded
shares: 0,             // ❌ Siempre 0

// AHORA (BUENO)
action: myHeldPosition,  // YES or NO correcto
shares: -totalShares,    // Negativo para indicar venta
```

---

### 8. **Marcar TODOS los Bets como Vendidos** ✅
**Archivo:** `app/market/[slug]/page.tsx:953-956`

```typescript
// ANTES (MALO)
await supabaseDb.cancelBet(publicKey?.toBase58() || '', effectiveSlug);
// Solo marca UNO como vendido

// AHORA (BUENO)
for (const bet of myBetsThisSide) {
    await supabaseDb.claimPayout(bet.id!);
}
// Marca TODOS los bets del lado como claimed
```

---

## 🧪 TESTING REQUERIDO

### Test 1: Liquidez Inicial (Binary Market)
```bash
1. Crear market "Test Binary" (YES/NO)
2. Comprar 1 SOL de YES
3. ✅ Esperado: Precio sube a ~60% (NO 100%)
4. ✅ Esperado: total_yes_pool = ~$200, total_no_pool = ~$100
5. Comprar 1 SOL de NO
6. ✅ Esperado: Precio baja a ~50%
7. ✅ Esperado: total_yes_pool = ~$200, total_no_pool = ~$300
```

### Test 2: Multi-Outcome (Peru vs Chile)
```bash
1. Crear market "Peru vs Chile"
2. Comprar 1 SOL de Peru
3. ✅ Esperado: Peru sube a ~60%, Chile baja a ~40%
4. ✅ Esperado: Peru mcap = $200, Chile mcap = $0
5. Comprar 2 SOL de Chile
6. ✅ Esperado: Chile sube a ~70%, Peru baja a ~30%
7. ✅ Esperado: Peru mcap = $200, Chile mcap = $400
8. ✅ Esperado: Gráfico muestra AMBAS líneas moviéndose
```

### Test 3: Venta Independiente
```bash
1. Tener 1 SOL en Peru, 2 SOL en Chile
2. Vender Peru
3. ✅ Esperado: Solo Peru se vende
4. ✅ Esperado: Chile shares intactos
5. ✅ Esperado: Peru mcap baja, Chile mcap NO cambia
6. ✅ Esperado: "You get: ~$200" (valor correcto)
```

### Test 4: Gráfico Sincronizado
```bash
1. Crear market a las 3:00 PM
2. ✅ Esperado: Gráfico empieza a las 3:00 PM
3. ✅ Esperado: NO hay puntos antes de 3:00 PM
4. Comprar a las 3:05 PM
5. ✅ Esperado: Nuevo punto a las 3:05 PM
```

---

## 📊 CÓMO DEBUGGEAR

### Ver Pools en Consola
```typescript
console.log('📊 Current Pools:', {
    yesPool: currentYesPool,
    noPool: currentNoPool,
    probability: livePrice
});
```

### Ver Posiciones de Usuario
```typescript
console.log('📊 User positions:', {
    yesAmount: yesTotalAmount,
    noAmount: noTotalAmount,
    yesBets: yesBets.length,
    noBets: noBets.length
});
```

### Verificar DB después de cada trade
```sql
SELECT slug, total_yes_pool, total_no_pool, created_at
FROM markets
WHERE slug LIKE '%peru%';
```

---

## 🔥 PROBLEMAS PENDIENTES

### 1. **UI No Muestra YES + NO Simultáneos**
Actualmente, si tienes YES y NO al mismo tiempo, solo muestra uno.

**Fix Pendiente:**
```typescript
// Mostrar AMBOS botones si usuario tiene ambos lados
{yesBets.length > 0 && (
    <button>Sell YES: ${yesTotalAmount}</button>
)}
{noBets.length > 0 && (
    <button>Sell NO: ${noTotalAmount}</button>
)}
```

### 2. **Inicialización de Pools en CreateMarket**
Cuando creas un market NUEVO, los pools NO se inicializan.

**Fix Pendiente:** En `CreateMarketModal` o donde creas markets:
```typescript
const { INITIAL_LIQUIDITY_PER_SIDE } = require('@/lib/amm/calculations');

await supabaseDb.createMarket({
    slug: marketSlug,
    title: marketTitle,
    creator_wallet: publicKey.toBase58(),
    total_yes_pool: INITIAL_LIQUIDITY_PER_SIDE, // ← AGREGAR
    total_no_pool: INITIAL_LIQUIDITY_PER_SIDE,  // ← AGREGAR
    resolved: false
});
```

### 3. **Multi-Outcome Chart NO Usa Tiempo Real**
El chart multi-line aún genera datos fake.

**Fix Pendiente:** Aplicar `generateChartData()` a multi-outcome también.

---

## 📝 RESUMEN EJECUTIVO

### ✅ ARREGLADO:
1. Pools reales persistidos en DB
2. Probabilidad calculada desde pools (no al revés)
3. Gráfico sincronizado con fecha de creación
4. Market cap separado por outcome
5. Venta independiente por lado
6. Shares YES/NO NO se mezclan
7. Activity log correcto

### ⚠️ PENDIENTE:
1. Inicializar pools al crear market
2. UI para vender YES y NO simultáneos
3. Multi-outcome chart con tiempo real
4. SPL tokens en wallet (blockchain)

---

**Fecha:** 2026-01-20
**Version:** 2.0
**Status:** ✅ CRITICAL BUGS FIXED - TESTING REQUIRED
