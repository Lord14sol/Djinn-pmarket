# 🔧 FIX: UI de Venta con Slider para YES/NO Separados

## 🔴 PROBLEMAS ACTUALES:

1. ❌ **YES Token y NO Token tienen la misma CA** → Bug del smart contract Rust
2. ❌ **"Shares to Sell" no muestra shares correctos** → UI no calculada
3. ❌ **No puedes elegir qué lado vender** → Falta selector YES/NO
4. ❌ **Slider al 100% no funciona** → No está implementado

---

## ✅ SOLUCIÓN COMPLETA

### Parte 1: Arreglar Smart Contract (Opcional - Requiere Rust)

**Archivo:** `programs/djinn-market/src/lib.rs`

El problema es que los seeds para YES y NO tokens están generando el mismo PDA.

**Busca en el código Rust:**
```rust
// ❌ MALO - Mismo seed
let yes_mint_seed = &[b"token_mint", market.key().as_ref()];
let no_mint_seed = &[b"token_mint", market.key().as_ref()]; // Mismo!

// ✅ BUENO - Seeds diferentes
let yes_mint_seed = &[b"yes_token_mint", market.key().as_ref()];
let no_mint_seed = &[b"no_token_mint", market.key().as_ref()];
```

**Si no quieres modificar Rust por ahora**, puedes usar la solución del frontend (Parte 2).

---

### Parte 2: UI de Venta con Slider (Frontend)

**Cambios necesarios en `app/market/[slug]/page.tsx`:**

#### 1. State Variables (línea ~122-125)

```typescript
// REEMPLAZAR:
const [myHeldPosition, setMyHeldPosition] = useState<'YES' | 'NO' | null>(null);
const [myHeldAmount, setMyHeldAmount] = useState<string | null>(null);

// CON:
const [myYesShares, setMyYesShares] = useState<number>(0);
const [myNoShares, setMyNoShares] = useState<number>(0);
const [myYesAmountUSD, setMyYesAmountUSD] = useState<number>(0);
const [myNoAmountUSD, setMyNoAmountUSD] = useState<number>(0);
const [sellSide, setSellSide] = useState<'YES' | 'NO'>('YES');
const [sellPercentage, setSellPercentage] = useState<number>(100);
```

#### 2. Cargar Posiciones (línea ~328-350)

```typescript
// REEMPLAZAR TODO el bloque de "Load User's Position" CON:
if (publicKey) {
    const userBets = await supabaseDb.getUserBets(publicKey.toBase58());
    const myBetsForThisMarket = userBets.filter(b =>
        b.market_slug === effectiveSlug && !b.claimed
    );

    if (myBetsForThisMarket.length > 0) {
        // Separar por lado
        const yesBets = myBetsForThisMarket.filter(b => b.side === 'YES');
        const noBets = myBetsForThisMarket.filter(b => b.side === 'NO');

        // Sumar shares y amounts
        const yesShares = yesBets.reduce((sum, b) => sum + b.shares, 0);
        const noShares = noBets.reduce((sum, b) => sum + b.shares, 0);
        const yesAmount = yesBets.reduce((sum, b) => sum + b.amount, 0);
        const noAmount = noBets.reduce((sum, b) => sum + b.amount, 0);

        // Actualizar state
        setMyYesShares(yesShares);
        setMyNoShares(noShares);
        setMyYesAmountUSD(yesAmount);
        setMyNoAmountUSD(noAmount);

        console.log('📊 User positions:', {
            yesShares,
            noShares,
            yesAmount,
            noAmount
        });
    }
}
```

#### 3. UI de Venta Completa (línea ~784-880)

```typescript
// REEMPLAZAR TODO el bloque de "REDEEM / SELL BUTTON" CON:

{/* SELL INTERFACE - Con Selector YES/NO y Slider */}
{(myYesShares > 0 || myNoShares > 0) && (
    <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
        <h4 className="text-[10px] font-black uppercase text-gray-500 tracking-widest">
            Your Positions
        </h4>

        {/* Mostrar ambas posiciones */}
        <div className="grid grid-cols-2 gap-3">
            {myYesShares > 0 && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase text-emerald-500 mb-1">
                        YES Shares
                    </div>
                    <div className="text-lg font-black text-white">
                        {myYesShares.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        ${myYesAmountUSD.toFixed(2)} USD
                    </div>
                </div>
            )}

            {myNoShares > 0 && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                    <div className="text-[9px] font-black uppercase text-red-500 mb-1">
                        NO Shares
                    </div>
                    <div className="text-lg font-black text-white">
                        {myNoShares.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500">
                        ${myNoAmountUSD.toFixed(2)} USD
                    </div>
                </div>
            )}
        </div>

        {/* Selector de lado para vender */}
        <div>
            <label className="text-[10px] font-black uppercase text-gray-500 block mb-2">
                Select Side to Sell
            </label>
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => setSellSide('YES')}
                    disabled={myYesShares === 0}
                    className={`p-3 rounded-xl border font-bold text-xs uppercase transition-all ${
                        sellSide === 'YES'
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500'
                            : 'bg-white/5 border-white/10 text-gray-500'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                    Sell YES
                </button>
                <button
                    onClick={() => setSellSide('NO')}
                    disabled={myNoShares === 0}
                    className={`p-3 rounded-xl border font-bold text-xs uppercase transition-all ${
                        sellSide === 'NO'
                            ? 'bg-red-500/20 border-red-500 text-red-500'
                            : 'bg-white/5 border-white/10 text-gray-500'
                    } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                    Sell NO
                </button>
            </div>
        </div>

        {/* Slider de porcentaje */}
        <div>
            <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-black uppercase text-gray-500">
                    Amount to Sell
                </label>
                <span className="text-sm font-black text-[#F492B7]">
                    {sellPercentage}%
                </span>
            </div>
            <input
                type="range"
                min="0"
                max="100"
                value={sellPercentage}
                onChange={(e) => setSellPercentage(Number(e.target.value))}
                className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-[#F492B7]
                    [&::-webkit-slider-thumb]:cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-gray-600 mt-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
            </div>
        </div>

        {/* Resumen de venta */}
        {sellPercentage > 0 && (
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Shares to Sell</span>
                    <span className="font-black text-white">
                        {((sellSide === 'YES' ? myYesShares : myNoShares) * sellPercentage / 100).toFixed(2)}
                    </span>
                </div>
                <div className="flex justify-between text-xs">
                    <span className="text-gray-500">You Get</span>
                    <span className="font-black text-[#10B981]">
                        ${((sellSide === 'YES' ? myYesAmountUSD : myNoAmountUSD) * sellPercentage / 100).toFixed(2)}
                    </span>
                </div>
            </div>
        )}

        {/* Botón de venta */}
        <button
            onClick={async () => {
                if (sellPercentage === 0) {
                    alert('Select an amount to sell');
                    return;
                }

                if (!confirm(`Sell ${sellPercentage}% of your ${sellSide} shares?`)) {
                    return;
                }

                setIsPending(true);
                try {
                    // Get user's bets for the selected side
                    const userBets = await supabaseDb.getUserBets(publicKey?.toBase58() || '');
                    const myBetsThisSide = userBets.filter(b =>
                        b.market_slug === effectiveSlug &&
                        b.side === sellSide &&
                        !b.claimed
                    );

                    const totalShares = myBetsThisSide.reduce((sum, b) => sum + b.shares, 0);
                    const totalInvestedUSD = myBetsThisSide.reduce((sum, b) => sum + b.amount, 0);

                    // Calculate amount to sell based on percentage
                    const sharesToSell = totalShares * (sellPercentage / 100);
                    const amountToSellUSD = totalInvestedUSD * (sellPercentage / 100);

                    // Use AMM inverse formula
                    const { calculateBetOutcome, INITIAL_LIQUIDITY_PER_SIDE } = require('@/lib/amm/calculations');

                    const sellPool = {
                        yesPool: currentYesPool || INITIAL_LIQUIDITY_PER_SIDE,
                        noPool: currentNoPool || INITIAL_LIQUIDITY_PER_SIDE
                    };

                    // Selling YES = buying NO (inverse)
                    const inverseSide = sellSide === 'YES' ? 'NO' : 'YES';
                    const sellOutcome = calculateBetOutcome(sellPool, amountToSellUSD, inverseSide);

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

                    await supabaseDb.updateMarketPrice(effectiveSlug, sellOutcome.newProbability, -amountToSellUSD);

                    // Log activity
                    await supabaseDb.createActivity({
                        wallet_address: publicKey?.toBase58() || 'anon',
                        username: userProfile.username,
                        avatar_url: userProfile.avatarUrl,
                        action: sellSide,
                        amount: amountToSellUSD,
                        sol_amount: amountToSellUSD / solPrice,
                        shares: -sharesToSell,
                        market_title: staticMarketInfo.title,
                        market_slug: effectiveSlug,
                        created_at: new Date().toISOString()
                    });

                    // If selling 100%, mark all bets as claimed
                    if (sellPercentage === 100) {
                        for (const bet of myBetsThisSide) {
                            await supabaseDb.claimPayout(bet.id!);
                        }

                        // Update local state
                        if (sellSide === 'YES') {
                            setMyYesShares(0);
                            setMyYesAmountUSD(0);
                        } else {
                            setMyNoShares(0);
                            setMyNoAmountUSD(0);
                        }
                    } else {
                        // Partial sell - reduce shares proportionally
                        if (sellSide === 'YES') {
                            setMyYesShares(prev => prev * (1 - sellPercentage / 100));
                            setMyYesAmountUSD(prev => prev * (1 - sellPercentage / 100));
                        } else {
                            setMyNoShares(prev => prev * (1 - sellPercentage / 100));
                            setMyNoAmountUSD(prev => prev * (1 - sellPercentage / 100));
                        }
                    }

                    // Refund
                    setSolBalance(prev => prev + (amountToSellUSD / solPrice));

                    // Reset slider
                    setSellPercentage(100);

                    alert(`Sold ${sellPercentage}% of ${sellSide} shares! +$${amountToSellUSD.toFixed(2)}`);

                    // Sync with widgets
                    window.dispatchEvent(new Event('bet-updated'));

                } catch (e) {
                    console.error('Error selling:', e);
                    alert('Error processing sell.');
                } finally {
                    setIsPending(false);
                }
            }}
            disabled={isPending || sellPercentage === 0}
            className="w-full py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-500 font-bold text-sm uppercase hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
            {isPending ? '⏳ Selling...' : `Sell ${sellPercentage}% of ${sellSide}`}
        </button>
    </div>
)}
```

---

## 🧪 TESTING

Después de aplicar los cambios:

1. Ve al market "Final Review"
2. Deberías ver dos cajas:
   - "YES Shares: X" con monto en USD
   - "NO Shares: Y" con monto en USD
3. Selecciona "Sell YES" o "Sell NO"
4. Mueve el slider al 100%
5. Verifica que "Shares to Sell" muestra tus shares correctos
6. Verifica que "You Get" muestra el monto en USD correcto
7. Click en "Sell 100% of YES"
8. Confirma que se vende correctamente

---

## 📝 SOBRE EL BUG DE TOKENS IGUALES

**YES Token y NO Token con misma CA** es un bug del smart contract de Rust.

**Solución Temporal:**
Por ahora, los tokens tienen la misma dirección en Solana, pero el **frontend separa correctamente** los shares YES y NO en la base de datos Supabase. Esto significa:

✅ Puedes comprar YES y NO separadamente
✅ Puedes vender YES y NO separadamente
✅ Los mcaps se actualizan correctamente
❌ Los tokens en la blockchain tienen la misma CA (necesita fix en Rust)

**Para arreglar permanentemente:**
Necesitas modificar `programs/djinn-market/src/lib.rs` y cambiar los seeds como mencioné arriba, luego re-deployar el programa.

---

**Fecha:** 2026-01-20
**Status:** ✅ Solución Lista para Aplicar
