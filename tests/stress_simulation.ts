
import {
    getSpotPrice,
    simulateBuy,
    calculateImpliedProbability,
    MarketState,
    getIgnitionStatus
} from "../lib/core-amm";

// Mock Market State
let yesSupply = 0;
let noSupply = 0;

function logStep(stepName: string, amountSol: number, side: 'YES' | 'NO') {
    const supply = side === 'YES' ? yesSupply : noSupply;

    // Simulate trade against current state
    const sim = simulateBuy(amountSol, {
        totalSharesMinted: supply,
        virtualSolReserves: 0,
        virtualShareReserves: 0,
        realSolReserves: 0
    });

    // Update State
    if (side === 'YES') yesSupply += sim.sharesReceived;
    else noSupply += sim.sharesReceived;

    // Calculate Metrics
    const yesPrice = getSpotPrice(yesSupply);
    const noPrice = getSpotPrice(noSupply); // Independent Price
    const probability = calculateImpliedProbability(yesSupply, noSupply);

    // Mcap = Supply * Price * SOL_Price (Assuming 1 SOL = $150 for Mcap display or just SOL context)
    // We'll just track SOL Mcap here
    const yesMcap = yesSupply * yesPrice;

    console.log(`\n--- STEP: ${stepName} (${amountSol} SOL on ${side}) ---`);
    console.log(`SHARES BOUGHT: ${sim.sharesReceived.toLocaleString()}`);
    console.log(`ENTRY PRICE:   ${sim.averageEntryPrice.toFixed(9)} SOL`);
    console.log(`PRICE IMPACT:  ${sim.priceImpact.toFixed(2)}%`);
    console.log(`\nSTATUS AFTER TRADE:`);
    console.log(`  SUPPLY:      YES: ${(yesSupply / 1e6).toFixed(2)}M | NO: ${(noSupply / 1e6).toFixed(2)}M`);
    console.log(`  DJINN PRICE: YES: ${yesPrice.toFixed(6)} SOL | NO: ${noPrice.toFixed(6)} SOL  <-- Independent`);
    console.log(`  PROBABILITY: YES: ${probability.toFixed(2)}%     | NO: ${(100 - probability).toFixed(2)}%     <-- Zero Sum`);
    console.log(`  MCAP (YES):  ${yesMcap.toLocaleString()} SOL`);
    console.log(`  IGNITION:    ${getIgnitionStatus(yesSupply)}`);
}

async function runStressTest() {
    console.log("🧞 STARTING DJINN MARKET STRESS TEST");
    console.log("====================================");

    // 1. Accumulation Phase
    logStep("Small Buy 1", 0.1, 'YES');
    logStep("Small Buy 2", 0.2, 'YES');
    logStep("Small Buy 3", 0.3, 'YES');
    logStep("Small Buy 4", 0.4, 'YES');
    logStep("Small Buy 5", 0.5, 'YES');

    // 2. Breaking Out
    logStep("Medium Buy", 1.0, 'YES');
    logStep("Whale Buy", 3.0, 'YES');

    // 3. Counter Trade (Verify Independence)
    console.log("\n>>> INTERRUPTION: BUYING 'NO' SHARES <<<");
    logStep("Counter Buy", 1.0, 'NO');

    // 4. Viral Simulation (Loop to 600M Supply)
    console.log("\n>>> STARTING VIRAL SIMULATION (Target: 600M Supply) <<<");
    let step = 1;
    while (yesSupply < 600_000_000) {
        // Buy 50 SOL at a time to speed up simulation
        const supply = yesSupply;
        const sim = simulateBuy(50, {
            totalSharesMinted: supply,
            virtualSolReserves: 0,
            virtualShareReserves: 0,
            realSolReserves: 0
        });
        yesSupply += sim.sharesReceived;

        if (step % 5 === 0 || yesSupply >= 600_000_000) {
            const yesPrice = getSpotPrice(yesSupply);
            const probability = calculateImpliedProbability(yesSupply, noSupply);
            console.log(`[Viral Step ${step}] Supply: ${(yesSupply / 1e6).toFixed(1)}M | Price: ${yesPrice.toFixed(6)} SOL | Prob: ${probability.toFixed(2)}%`);
        }
        step++;
    }

    console.log("\n>>> VIRAL COMPLETE. SUPPLY IS > 600M. <<<");

    // 5. LATE COUNTER-TRADE (Arbitrage Test)
    // At this point, YES is expensive (high probability). NO is dirt cheap (floor price).
    // If someone buys NO now, they get massive leverage if the probability reverts.
    // Also, this adds liquidity to the TOTAL POT.
    console.log("\n>>> ARBITRAGE TEST: Buying 5 SOL of 'NO' (Cheap Side) <<<");
    logStep("Arbitrage Buy NO", 5.0, 'NO');

    // 6. Check Total Pot & Liquidity
    console.log("\n>>> LIQUIDITY & UTILITY CHECK <<<");
    // In a real scenario, this 'NO' buy contributes to the pot. 
    // If YES wins, the 'NO' liquidity is eaten. 
    // If NO wins, the payout is massive.
    const potSize = (yesSupply * getSpotPrice(yesSupply)) + (noSupply * getSpotPrice(noSupply));
    console.log(`Estimated Virtual Pot Size: ${potSize.toLocaleString()} SOL`);

    console.log("\n✅ STRESS TEST COMPLETE WITH ARBITRAGE");
}

runStressTest();
