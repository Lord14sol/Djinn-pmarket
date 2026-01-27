import { getSpotPrice, simulateBuy } from "../lib/core-amm";

console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║           💡 ¿DE DÓNDE SALE EL DINERO PARA PAGAR?                            ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

// ============================================================================
// ESCENARIO 1: Solo YES buyers (nadie compra NO)
// ============================================================================

console.log('\n\n📍 ESCENARIO 1: Solo compran YES (nadie compra NO)');
console.log('═'.repeat(70));

let yesSupply1 = 0;
let noSupply1 = 0;
let vault1 = 0;

// Alice, Bob, Carol compran YES
const sim1a = simulateBuy(1, { totalSharesMinted: yesSupply1, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
yesSupply1 += sim1a.sharesReceived;
vault1 += 1;
const aliceShares = sim1a.sharesReceived;

const sim1b = simulateBuy(2, { totalSharesMinted: yesSupply1, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
yesSupply1 += sim1b.sharesReceived;
vault1 += 2;
const bobShares = sim1b.sharesReceived;

const sim1c = simulateBuy(1, { totalSharesMinted: yesSupply1, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
yesSupply1 += sim1c.sharesReceived;
vault1 += 1;
const carolShares = sim1c.sharesReceived;

console.log('\n💸 COMPRAS:');
console.log(`  Alice compra YES con 1 SOL → ${aliceShares.toFixed(0)} shares`);
console.log(`  Bob compra YES con 2 SOL → ${bobShares.toFixed(0)} shares`);
console.log(`  Carol compra YES con 1 SOL → ${carolShares.toFixed(0)} shares`);

console.log('\n🏦 VAULT:');
console.log(`  Total SOL en vault: ${vault1} SOL`);
console.log(`  Total YES shares: ${yesSupply1.toFixed(0)}`);
console.log(`  Total NO shares: ${noSupply1}`);

console.log('\n📊 PROBABILIDAD:');
console.log(`  YES: 100% (porque no hay NO shares)`);
console.log(`  NO: 0%`);

// Resolution: YES wins
const payoutPerShare1 = vault1 / yesSupply1;
const alicePayout1 = aliceShares * payoutPerShare1;
const bobPayout1 = bobShares * payoutPerShare1;
const carolPayout1 = carolShares * payoutPerShare1;

console.log('\n🏆 RESOLUTION: YES GANA!');
console.log('\n💰 PAYOUTS:');
console.log(`  Alice: invirtió 1 SOL → recibe ${alicePayout1.toFixed(4)} SOL (${((alicePayout1/1-1)*100).toFixed(2)}%)`);
console.log(`  Bob: invirtió 2 SOL → recibe ${bobPayout1.toFixed(4)} SOL (${((bobPayout1/2-1)*100).toFixed(2)}%)`);
console.log(`  Carol: invirtió 1 SOL → recibe ${carolPayout1.toFixed(4)} SOL (${((carolPayout1/1-1)*100).toFixed(2)}%)`);
console.log(`\n  TOTAL PAGADO: ${(alicePayout1+bobPayout1+carolPayout1).toFixed(4)} SOL`);
console.log(`  VAULT TENÍA: ${vault1} SOL`);

console.log('\n⚠️  RESULTADO: Nadie ganó EXTRA. Solo recuperaron ~lo que pusieron.');
console.log('   El dinero NO se multiplica si no hay perdedores.');

// ============================================================================
// ESCENARIO 2: YES + NO buyers
// ============================================================================

console.log('\n\n📍 ESCENARIO 2: Compran YES y NO (hay perdedores)');
console.log('═'.repeat(70));

let yesSupply2 = 0;
let noSupply2 = 0;
let vault2 = 0;

// Alice, Bob compran YES
const sim2a = simulateBuy(1, { totalSharesMinted: yesSupply2, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
yesSupply2 += sim2a.sharesReceived;
vault2 += 1;
const alice2Shares = sim2a.sharesReceived;

const sim2b = simulateBuy(2, { totalSharesMinted: yesSupply2, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
yesSupply2 += sim2b.sharesReceived;
vault2 += 2;
const bob2Shares = sim2b.sharesReceived;

// Dave compra NO
const sim2d = simulateBuy(5, { totalSharesMinted: noSupply2, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
noSupply2 += sim2d.sharesReceived;
vault2 += 5;
const daveShares = sim2d.sharesReceived;

console.log('\n💸 COMPRAS:');
console.log(`  Alice compra YES con 1 SOL → ${alice2Shares.toFixed(0)} shares`);
console.log(`  Bob compra YES con 2 SOL → ${bob2Shares.toFixed(0)} shares`);
console.log(`  Dave compra NO con 5 SOL → ${daveShares.toFixed(0)} shares`);

console.log('\n🏦 VAULT:');
console.log(`  Total SOL en vault: ${vault2} SOL (1 + 2 + 5)`);
console.log(`  Total YES shares: ${yesSupply2.toFixed(0)}`);
console.log(`  Total NO shares: ${noSupply2.toFixed(0)}`);

const prob = (yesSupply2 / (yesSupply2 + noSupply2)) * 100;
console.log('\n📊 PROBABILIDAD:');
console.log(`  YES: ${prob.toFixed(2)}%`);
console.log(`  NO: ${(100-prob).toFixed(2)}%`);

// Resolution: YES wins
const payoutPerShare2 = vault2 / yesSupply2;
const alicePayout2 = alice2Shares * payoutPerShare2;
const bobPayout2 = bob2Shares * payoutPerShare2;

console.log('\n🏆 RESOLUTION: YES GANA!');
console.log('\n💰 PAYOUTS:');
console.log(`  Alice: invirtió 1 SOL → recibe ${alicePayout2.toFixed(4)} SOL (+${((alicePayout2/1-1)*100).toFixed(0)}% profit) 🚀`);
console.log(`  Bob: invirtió 2 SOL → recibe ${bobPayout2.toFixed(4)} SOL (+${((bobPayout2/2-1)*100).toFixed(0)}% profit) 🚀`);
console.log(`  Dave: invirtió 5 SOL → recibe 0 SOL (PERDIÓ TODO) 💀`);
console.log(`\n  TOTAL PAGADO: ${(alicePayout2+bobPayout2).toFixed(4)} SOL`);
console.log(`  VAULT TENÍA: ${vault2} SOL`);

console.log('\n🚀 RESULTADO: Alice y Bob GANARON el dinero de Dave!');
console.log(`   Alice: 1 SOL → ${alicePayout2.toFixed(2)} SOL (+${((alicePayout2/1-1)*100).toFixed(0)}%)`);
console.log(`   Bob: 2 SOL → ${bobPayout2.toFixed(2)} SOL (+${((bobPayout2/2-1)*100).toFixed(0)}%)`);
console.log('   Dave: 5 SOL → 0 SOL (-100%)');

// ============================================================================
// ESCENARIO 3: UNDERDOG wins (NO gana siendo minoría)
// ============================================================================

console.log('\n\n📍 ESCENARIO 3: UNDERDOG! (NO gana siendo 17%)');
console.log('═'.repeat(70));

let yesSupply3 = 0;
let noSupply3 = 0;
let vault3 = 0;

// Muchos compran YES
const sim3a = simulateBuy(10, { totalSharesMinted: yesSupply3, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
yesSupply3 += sim3a.sharesReceived;
vault3 += 10;

// Solo Eve compra NO (underdog)
const sim3e = simulateBuy(2, { totalSharesMinted: noSupply3, virtualSolReserves: 0, virtualShareReserves: 0, realSolReserves: 0 });
noSupply3 += sim3e.sharesReceived;
vault3 += 2;
const eveShares = sim3e.sharesReceived;

const prob3 = (yesSupply3 / (yesSupply3 + noSupply3)) * 100;

console.log('\n💸 COMPRAS:');
console.log(`  Crowd compra YES con 10 SOL total`);
console.log(`  Eve compra NO con 2 SOL → ${eveShares.toFixed(0)} shares (SOLA)`);

console.log('\n🏦 VAULT:');
console.log(`  Total SOL en vault: ${vault3} SOL`);

console.log('\n📊 PROBABILIDAD:');
console.log(`  YES: ${prob3.toFixed(2)}% (favorito)`);
console.log(`  NO: ${(100-prob3).toFixed(2)}% (underdog)`);

// Resolution: NO wins!
const payoutPerShare3 = vault3 / noSupply3;
const evePayout = eveShares * payoutPerShare3;

console.log('\n🏆 RESOLUTION: ¡¡¡NO GANA!!! (UPSET!)');
console.log('\n💰 PAYOUTS:');
console.log(`  Crowd (YES): invirtieron 10 SOL → reciben 0 SOL (PERDIERON TODO) 💀`);
console.log(`  Eve (NO): invirtió 2 SOL → recibe ${evePayout.toFixed(4)} SOL`);
console.log(`\n  EVE GANÓ: +${((evePayout/2-1)*100).toFixed(0)}% = ${(evePayout/2).toFixed(1)}x su inversión! 🚀🚀🚀`);

console.log('\n💎 Esta es la MAGIA del sistema:');
console.log('   Si crees que el mercado está EQUIVOCADO (underdog bet)');
console.log('   Y tienes razón → TE LLEVAS TODO EL DINERO DE LOS FAVORITOS');

// ============================================================================
// RESUMEN FINAL
// ============================================================================

console.log('\n\n');
console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║                         📚 RESUMEN FINAL                                     ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');

console.log('\n🎯 ¿CUÁNTAS SHARES HAY?');
console.log('   → INFINITAS. Cada compra minta nuevas shares.');
console.log('   → No hay cap. Supply crece con cada compra.');
console.log('   → YES puede tener 1M shares, NO puede tener 50M, o viceversa.');

console.log('\n🎯 ¿DE DÓNDE SALE EL DINERO?');
console.log('   → Del VAULT que acumula TODO el SOL de TODAS las compras.');
console.log('   → LOS PERDEDORES PAGAN A LOS GANADORES.');
console.log('   → Es un juego de suma cero: lo que ganas = lo que otros pierden.');

console.log('\n🎯 ¿SI SOLO COMPRAN YES?');
console.log('   → El gráfico muestra ~100% YES');
console.log('   → Pero nadie gana EXTRA (solo recuperan lo que pusieron)');
console.log('   → Para ganar PROFIT en resolution, necesitas PERDEDORES');

console.log('\n🎯 ¿SI NADIE COMPRA NO?');
console.log('   → NO supply = 0');
console.log('   → Probabilidad = 100% YES / 0% NO');
console.log('   → Gráfico no se mueve para NO (no hay NO trades)');
console.log('   → Si YES gana: Se reparten entre ellos (~0% profit)');

console.log('\n🎯 ¿CÓMO SE HACE DINERO REAL?');
console.log('   ┌────────────────────────────────────────────────────────────┐');
console.log('   │ MÉTODO 1: TRADING (antes de resolution)                    │');
console.log('   │   - Comprar YES early cuando precio es bajo               │');
console.log('   │   - Vender YES cuando precio sube                         │');
console.log('   │   - NO NECESITAS esperar resolution                       │');
console.log('   │   - Ganancia = diferencia de precio × shares              │');
console.log('   │                                                            │');
console.log('   │ MÉTODO 2: RESOLUTION (esperar el resultado)                │');
console.log('   │   - Apostar al lado correcto                              │');
console.log('   │   - Si ganas: Te llevas parte del vault                   │');
console.log('   │   - Ganancia = SOL de los perdedores                      │');
console.log('   │                                                            │');
console.log('   │ MÉTODO 3: UNDERDOG BET (alto riesgo, alto reward)          │');
console.log('   │   - Apostar contra el consenso                            │');
console.log('   │   - Si pierdes: -100%                                     │');
console.log('   │   - Si ganas: +500% a +10000%                              │');
console.log('   └────────────────────────────────────────────────────────────┘');

console.log('\n🎯 ¿EL GRÁFICO SE MUEVE?');
console.log('   → SÍ, se mueve con cada compra/venta');
console.log('   → Compra YES → YES prob sube');
console.log('   → Compra NO → NO prob sube (YES baja)');
console.log('   → Si NADIE compra NO → NO prob queda en 0%');

console.log('\n');
