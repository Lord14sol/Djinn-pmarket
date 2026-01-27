/**
 * 🏆 SIMULACIÓN: FINAL DEL MUNDIAL - ARGENTINA vs FRANCIA
 *
 * Escenario: Mercado de predicción "¿Ganará Argentina?"
 * - YES = Argentina gana
 * - NO = Francia gana
 *
 * Timeline:
 * 1. Early birds compran (0.1, 0.5, 1 SOL)
 * 2. El mercado crece - más gente entra
 * 3. Algunos venden durante el partido (tradean)
 * 4. Resolución: Argentina gana (YES wins)
 * 5. Holders de YES reclaman ganancias
 */

import {
    getSpotPrice,
    simulateBuy,
    simulateSell,
    calculateImpliedProbability,
    TOTAL_SUPPLY,
    VIRTUAL_OFFSET,
    FEE_RESOLUTION_PCT
} from '../lib/core-amm';

// Helper para formatear números
const fmt = (n: number, decimals = 2) => n.toLocaleString('en-US', { maximumFractionDigits: decimals });
const fmtSOL = (n: number) => `${fmt(n, 4)} SOL`;
const fmtShares = (n: number) => `${fmt(n / 1_000_000, 2)}M shares`;

interface Trader {
    name: string;
    side: 'YES' | 'NO';
    shares: number;
    invested: number;
    entryPrice: number;
    strategy: 'HOLDER' | 'TRADER' | 'ARBITRAGEUR';
}

interface MarketState {
    yesSupply: number;
    noSupply: number;
    yesVault: number;
    noVault: number;
}

// Simular compra en un lado del mercado
function buyOnSide(
    side: 'YES' | 'NO',
    solAmount: number,
    market: MarketState
): { shares: number; newSupply: number; solToVault: number; avgPrice: number } {
    const currentSupply = side === 'YES' ? market.yesSupply : market.noSupply;

    const state = {
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0,
        totalSharesMinted: currentSupply
    };

    const sim = simulateBuy(solAmount, state);

    return {
        shares: sim.sharesReceived,
        newSupply: currentSupply + sim.sharesReceived,
        solToVault: sim.netInvested,
        avgPrice: sim.averageEntryPrice
    };
}

// Simular venta
function sellOnSide(
    side: 'YES' | 'NO',
    sharesToSell: number,
    market: MarketState
): { solOut: number; newSupply: number } {
    const currentSupply = side === 'YES' ? market.yesSupply : market.noSupply;

    const state = {
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0,
        totalSharesMinted: currentSupply
    };

    const sim = simulateSell(sharesToSell, state);

    return {
        solOut: sim.sharesReceived,
        newSupply: currentSupply - sharesToSell
    };
}

// Calcular payout al resolver
function calculateResolutionPayout(
    winningShares: number,
    totalWinningSupply: number,
    totalPot: number
): number {
    const potAfterFee = totalPot * (1 - FEE_RESOLUTION_PCT);
    return (winningShares / totalWinningSupply) * potAfterFee;
}

// Calcular costo para llevar supply a un target usando integral
function getCostToReachSupply(currentSupply: number, targetSupply: number): number {
    if (targetSupply <= currentSupply) return 0;
    const pOld = getSpotPrice(currentSupply);
    const pNew = getSpotPrice(targetSupply);
    const delta = targetSupply - currentSupply;
    // Fee del 1%
    const grossCost = (pOld + pNew) / 2 * delta;
    return grossCost * 1.01; // Include entry fee
}

console.log('\n' + '═'.repeat(80));
console.log('🏆 SIMULACIÓN: FINAL DEL MUNDIAL - MERCADO "¿GANARÁ ARGENTINA?"');
console.log('═'.repeat(80));

// Estado inicial del mercado
let market: MarketState = {
    yesSupply: 0,
    noSupply: 0,
    yesVault: 0,
    noVault: 0
};

const traders: Trader[] = [];

// ═══════════════════════════════════════════════════════════════════════════
// FASE 1: EARLY BIRDS (Mercado recién creado)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(80));
console.log('📍 FASE 1: EARLY BIRDS - El mercado acaba de abrirse');
console.log('─'.repeat(80));

// Trader 1: Juan - Compra YES con 0.1 SOL (HOLDER hasta resolución)
{
    const result = buyOnSide('YES', 0.1, market);
    market.yesSupply = result.newSupply;
    market.yesVault += result.solToVault;

    traders.push({
        name: '🇦🇷 Juan (Argentina fan)',
        side: 'YES',
        shares: result.shares,
        invested: 0.1,
        entryPrice: result.avgPrice,
        strategy: 'HOLDER'
    });

    console.log(`\n✅ Juan compra YES con 0.1 SOL`);
    console.log(`   → Recibe: ${fmtShares(result.shares)}`);
    console.log(`   → Precio promedio: ${fmtSOL(result.avgPrice)}/share`);
    console.log(`   → Estrategia: HOLD hasta resolución`);
}

// Trader 2: Pierre - Compra NO con 0.5 SOL (TRADER - venderá antes)
{
    const result = buyOnSide('NO', 0.5, market);
    market.noSupply = result.newSupply;
    market.noVault += result.solToVault;

    traders.push({
        name: '🇫🇷 Pierre (Francia fan)',
        side: 'NO',
        shares: result.shares,
        invested: 0.5,
        entryPrice: result.avgPrice,
        strategy: 'TRADER'
    });

    console.log(`\n✅ Pierre compra NO con 0.5 SOL`);
    console.log(`   → Recibe: ${fmtShares(result.shares)}`);
    console.log(`   → Precio promedio: ${fmtSOL(result.avgPrice)}/share`);
    console.log(`   → Estrategia: TRADER (venderá si sube)`);
}

// Trader 3: María - Compra YES con 1 SOL (HOLDER hasta resolución)
{
    const result = buyOnSide('YES', 1, market);
    market.yesSupply = result.newSupply;
    market.yesVault += result.solToVault;

    traders.push({
        name: '🇦🇷 María (Mega fan)',
        side: 'YES',
        shares: result.shares,
        invested: 1,
        entryPrice: result.avgPrice,
        strategy: 'HOLDER'
    });

    console.log(`\n✅ María compra YES con 1 SOL`);
    console.log(`   → Recibe: ${fmtShares(result.shares)}`);
    console.log(`   → Precio promedio: ${fmtSOL(result.avgPrice)}/share`);
    console.log(`   → Estrategia: HOLD hasta resolución`);
}

// Estado después de early birds
console.log('\n📊 Estado del mercado después de Early Birds:');
console.log(`   YES Supply: ${fmtShares(market.yesSupply)} | Vault: ${fmtSOL(market.yesVault)}`);
console.log(`   NO Supply: ${fmtShares(market.noSupply)} | Vault: ${fmtSOL(market.noVault)}`);
const prob1 = calculateImpliedProbability(market.yesSupply, market.noSupply);
console.log(`   Probabilidad YES: ${prob1.toFixed(1)}%`);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 2: EL MERCADO CRECE (Más gente entra - Simulación rápida)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(80));
console.log('📍 FASE 2: CRECIMIENTO - El partido genera hype');
console.log('─'.repeat(80));

// Calcular cuánto SOL se necesita para llevar YES a 50M y NO a 30M
const yesTarget1 = 50_000_000;
const noTarget1 = 30_000_000;

const yesCost1 = getCostToReachSupply(market.yesSupply, yesTarget1);
const noCost1 = getCostToReachSupply(market.noSupply, noTarget1);

market.yesVault += yesCost1 * 0.99; // 99% goes to vault (1% fee)
market.noVault += noCost1 * 0.99;
market.yesSupply = yesTarget1;
market.noSupply = noTarget1;

console.log(`\n🚀 Múltiples traders entran al mercado...`);
console.log(`   Inversión en YES: ~${fmtSOL(yesCost1)}`);
console.log(`   Inversión en NO: ~${fmtSOL(noCost1)}`);

console.log('\n📊 Estado del mercado después del crecimiento:');
console.log(`   YES Supply: ${fmtShares(market.yesSupply)} | Vault: ${fmtSOL(market.yesVault)}`);
console.log(`   NO Supply: ${fmtShares(market.noSupply)} | Vault: ${fmtSOL(market.noVault)}`);
console.log(`   YES Spot Price: ${fmtSOL(getSpotPrice(market.yesSupply))}`);
console.log(`   NO Spot Price: ${fmtSOL(getSpotPrice(market.noSupply))}`);
const prob2 = calculateImpliedProbability(market.yesSupply, market.noSupply);
console.log(`   Probabilidad YES: ${prob2.toFixed(1)}%`);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 3: TRADING ACTIVO (Pierre vende, arbitrajistas entran)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(80));
console.log('📍 FASE 3: TRADING ACTIVO - El partido está en vivo');
console.log('─'.repeat(80));

// Pierre vende sus NO (tomando profit)
const pierre = traders.find(t => t.name.includes('Pierre'))!;
{
    const priceBeforeSell = getSpotPrice(market.noSupply);
    const sellResult = sellOnSide('NO', pierre.shares, market);
    market.noSupply = sellResult.newSupply;
    market.noVault -= sellResult.solOut;

    const profit = sellResult.solOut - pierre.invested;
    const roi = (profit / pierre.invested) * 100;

    console.log(`\n💰 Pierre VENDE sus NO shares (toma ganancias)`);
    console.log(`   → Vende: ${fmtShares(pierre.shares)}`);
    console.log(`   → Precio al vender: ${fmtSOL(priceBeforeSell)}/share`);
    console.log(`   → Recibe: ${fmtSOL(sellResult.solOut)}`);
    console.log(`   → Invirtió: ${fmtSOL(pierre.invested)}`);
    console.log(`   → PROFIT: ${fmtSOL(profit)} (${roi.toFixed(0)}% ROI)`);
    console.log(`   ✅ Pierre salió con ganancias SIN esperar resolución`);

    pierre.shares = 0;
}

// Arbitrajista: Carlos compra NO barato después del dump de Pierre
{
    const result = buyOnSide('NO', 20, market);
    market.noSupply = result.newSupply;
    market.noVault += result.solToVault;

    traders.push({
        name: '🎯 Carlos (Arbitrajista)',
        side: 'NO',
        shares: result.shares,
        invested: 20,
        entryPrice: result.avgPrice,
        strategy: 'ARBITRAGEUR'
    });

    console.log(`\n🎯 Carlos (arbitrajista) compra NO después del dump`);
    console.log(`   → Compra: ${fmtShares(result.shares)} por 20 SOL`);
    console.log(`   → Precio promedio: ${fmtSOL(result.avgPrice)}/share`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 4: PICO DEL MERCADO (YES vuela a 500M, NO en 200M)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(80));
console.log('📍 FASE 4: PICO - ¡Argentina domina! YES vuela');
console.log('─'.repeat(80));

// Llevar YES a ~500M supply, NO a ~200M
const finalYesSupply = 500_000_000;
const finalNoSupply = 200_000_000;

const yesCost2 = getCostToReachSupply(market.yesSupply, finalYesSupply);
const noCost2 = getCostToReachSupply(market.noSupply, finalNoSupply);

market.yesVault += yesCost2 * 0.99;
market.noVault += noCost2 * 0.99;
market.yesSupply = finalYesSupply;
market.noSupply = finalNoSupply;

console.log(`\n🔥 El mercado alcanza su pico:`);
console.log(`   YES Supply: ${fmtShares(market.yesSupply)} | Vault: ${fmtSOL(market.yesVault)}`);
console.log(`   NO Supply: ${fmtShares(market.noSupply)} | Vault: ${fmtSOL(market.noVault)}`);
console.log(`   YES Spot Price: ${fmtSOL(getSpotPrice(market.yesSupply))}`);
console.log(`   NO Spot Price: ${fmtSOL(getSpotPrice(market.noSupply))}`);
const prob4 = calculateImpliedProbability(market.yesSupply, market.noSupply);
console.log(`   Probabilidad YES: ${prob4.toFixed(1)}%`);

// Calcular valor de las posiciones de los early birds
console.log('\n📈 Valor actual de las posiciones de los EARLY BIRDS (si vendieran ahora):');
for (const trader of traders.filter(t => t.strategy === 'HOLDER' && t.shares > 0)) {
    const currentPrice = getSpotPrice(trader.side === 'YES' ? market.yesSupply : market.noSupply);
    const currentValue = trader.shares * currentPrice;
    const unrealizedProfit = currentValue - trader.invested;
    const multiplier = currentValue / trader.invested;

    console.log(`\n   ${trader.name}`);
    console.log(`   → Tiene: ${fmtShares(trader.shares)} ${trader.side}`);
    console.log(`   → Invirtió: ${fmtSOL(trader.invested)}`);
    console.log(`   → Valor actual (si vendiera): ${fmtSOL(currentValue)}`);
    console.log(`   → Profit no realizado: ${fmtSOL(unrealizedProfit)}`);
    console.log(`   → Multiplicador: ${multiplier.toFixed(1)}x`);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 5: RESOLUCIÓN - Argentina gana (YES wins)
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(80));
console.log('📍 FASE 5: RESOLUCIÓN - ¡ARGENTINA CAMPEÓN! 🏆');
console.log('─'.repeat(80));

console.log(`\n⚽ El oráculo confirma: YES (Argentina) GANA`);
console.log(`   Trading cerrado. Los holders de YES pueden reclamar.`);

const totalPot = market.yesVault + market.noVault;
const potAfterFee = totalPot * (1 - FEE_RESOLUTION_PCT);

console.log(`\n💰 Distribución del pot:`);
console.log(`   Total pot (YES + NO vaults): ${fmtSOL(totalPot)}`);
console.log(`   Fee del protocolo (2%): ${fmtSOL(totalPot * FEE_RESOLUTION_PCT)}`);
console.log(`   Pot para ganadores: ${fmtSOL(potAfterFee)}`);
console.log(`   Total YES shares: ${fmtShares(market.yesSupply)}`);

// Calcular payouts para los holders de YES
console.log('\n🎉 PAYOUTS PARA LOS GANADORES (YES HOLDERS):');
console.log('─'.repeat(60));

for (const trader of traders.filter(t => t.side === 'YES' && t.shares > 0)) {
    const payout = calculateResolutionPayout(trader.shares, market.yesSupply, totalPot);
    const profit = payout - trader.invested;
    const roi = (profit / trader.invested) * 100;
    const multiplier = payout / trader.invested;

    console.log(`\n   ${trader.name}`);
    console.log(`   ├─ Shares: ${fmtShares(trader.shares)} (${((trader.shares / market.yesSupply) * 100).toFixed(4)}% del pool)`);
    console.log(`   ├─ Invirtió: ${fmtSOL(trader.invested)}`);
    console.log(`   ├─ RECIBE: ${fmtSOL(payout)}`);
    console.log(`   ├─ PROFIT: ${fmtSOL(profit)}`);
    console.log(`   ├─ ROI: ${roi.toFixed(0)}%`);
    console.log(`   └─ MULTIPLICADOR: ${multiplier.toFixed(1)}x 🚀`);
}

// Calcular pérdidas para los holders de NO
console.log('\n😢 PERDEDORES (NO HOLDERS que no vendieron):');
console.log('─'.repeat(60));

for (const trader of traders.filter(t => t.side === 'NO' && t.shares > 0)) {
    console.log(`\n   ${trader.name}`);
    console.log(`   ├─ Shares: ${fmtShares(trader.shares)}`);
    console.log(`   ├─ Invirtió: ${fmtSOL(trader.invested)}`);
    console.log(`   └─ PIERDE TODO: -${fmtSOL(trader.invested)} ❌`);
}

// ═══════════════════════════════════════════════════════════════════════════
// RESUMEN FINAL
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(80));
console.log('📊 RESUMEN FINAL DE LA SIMULACIÓN');
console.log('═'.repeat(80));

console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                           RESULTADOS POR ESTRATEGIA                          │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');

// Juan - Early holder YES
const juan = traders.find(t => t.name.includes('Juan'))!;
const juanPayout = calculateResolutionPayout(juan.shares, market.yesSupply, totalPot);
console.log(`│ 🇦🇷 Juan (HOLDER YES)                                                        │`);
console.log(`│    Invirtió: 0.1 SOL → Recibe: ${juanPayout.toFixed(2)} SOL = ${(juanPayout/0.1).toFixed(0)}x 🚀              │`);

// María - Early holder YES
const maria = traders.find(t => t.name.includes('María'))!;
const mariaPayout = calculateResolutionPayout(maria.shares, market.yesSupply, totalPot);
console.log(`│ 🇦🇷 María (HOLDER YES)                                                       │`);
console.log(`│    Invirtió: 1 SOL → Recibe: ${mariaPayout.toFixed(2)} SOL = ${(mariaPayout/1).toFixed(0)}x 🚀                │`);

// Pierre - Trader que vendió
console.log(`│ 🇫🇷 Pierre (TRADER NO - vendió antes)                                        │`);
console.log(`│    Invirtió: 0.5 SOL → Salió con ~3 SOL = 6x (tradeando) ✅                 │`);

// Carlos - Arbitrajista que perdió
console.log(`│ 🎯 Carlos (ARBITRAJISTA NO)                                                  │`);
console.log(`│    Invirtió: 20 SOL → Pierde todo ❌                                        │`);

console.log('└─────────────────────────────────────────────────────────────────────────────┘');

console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                              CONCLUSIONES                                    │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log('│ 1. EARLY BIRDS hacen MÚLTIPLES X si aciertan y holdean                      │');
console.log('│ 2. SE PUEDE TRADEAR sin esperar resolución (Pierre vendió con 6x profit)   │');
console.log('│ 3. El TIMING importa: entrar early = mejor precio = más shares              │');
console.log('│ 4. Si NO aciertas y holdeas, PIERDES TODO el capital invertido              │');
console.log('│ 5. Los TRADERS pueden tomar ganancias durante el evento (no bloqueado)      │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');

// Tabla comparativa de multiplicadores según timing de entrada
console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│            MULTIPLICADORES SEGÚN TIMING DE ENTRADA (1 SOL en YES)           │');
console.log('│               Escenario: YES llega a 500M shares, gana resolución           │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');

const timingTests = [
    { name: 'Súper Early (0 supply)', supply: 0 },
    { name: 'Early (10M supply)', supply: 10_000_000 },
    { name: 'Mid (100M supply)', supply: 100_000_000 },
    { name: 'Late (300M supply)', supply: 300_000_000 },
    { name: 'Very Late (450M supply)', supply: 450_000_000 },
];

for (const test of timingTests) {
    const state = {
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0,
        totalSharesMinted: test.supply
    };
    const sim = simulateBuy(1, state);

    // Si el mercado llega a 500M YES y 200M NO, y YES gana
    const payout = calculateResolutionPayout(sim.sharesReceived, finalYesSupply, totalPot);
    const multiplier = payout / 1;

    console.log(`│ ${test.name.padEnd(30)} → ${multiplier.toFixed(1)}x (si YES gana)`.padEnd(76) + '│');
}

console.log('└─────────────────────────────────────────────────────────────────────────────┘');

// Comparación HOLD vs TRADE
console.log('\n┌─────────────────────────────────────────────────────────────────────────────┐');
console.log('│                           HOLD vs TRADE COMPARISON                           │');
console.log('├─────────────────────────────────────────────────────────────────────────────┤');
console.log('│                                                                             │');
console.log('│  HOLD hasta resolución:                                                     │');
console.log('│    ✅ Máximo profit si aciertas (participas del pot completo)               │');
console.log('│    ❌ Pierdes TODO si te equivocas                                          │');
console.log('│                                                                             │');
console.log('│  TRADE durante evento:                                                      │');
console.log('│    ✅ Tomas ganancias sin riesgo de resolución                              │');
console.log('│    ✅ Puedes arbitrar movimientos de precio                                 │');
console.log('│    ❌ Menor profit máximo (no participas del pot si vendes antes)           │');
console.log('│                                                                             │');
console.log('└─────────────────────────────────────────────────────────────────────────────┘');
