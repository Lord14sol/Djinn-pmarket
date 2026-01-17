
const VIRTUAL_OFFSET = 1_000_000_000; // 1B Shares
const K = 375_000_000_000_000; // Curve Constant

function calculateSharesFromSol(netInLamports: number, sOld: number): number {
    // S_new = sqrt( S_old^2 + 2 * NetIn * K )
    const term = 2 * netInLamports * K;
    const sNew = Math.sqrt(Math.pow(sOld, 2) + term);
    return sNew;
}

function calculateLiquidityFromShares(shares: number): number {
    // Liq = S^2 / 2K
    return Math.pow(shares, 2) / (2 * K);
}

function calculatePrice(shares: number): number {
    // P = S / K (Lamports per Share)
    return shares / K;
}

function runSimulation() {
    console.log("🧞 DJINN v2.0 'Golden Mutant' Simulation");
    console.log(`Virtual Offset: ${VIRTUAL_OFFSET.toLocaleString()} shares`);
    console.log(`Curve Constant (K): ${K.toLocaleString()}`);
    console.log("-".repeat(50));

    // 1. Curve Data Points (0 to 5000 SOL)
    console.log("\n📊 [Price Curve Data]");
    console.log("Vault SOL | Total Shares | Price (SOL)");

    let currentShares = VIRTUAL_OFFSET;
    // Initial Seed: 20M / 2 outcomes = 10M lamports per outcome (0.01 SOL) ?? 
    // Wait, GENESIS_SEED in lib.rs is 20_000_000 (0.02 SOL). u64.
    // Let's assume starting from pure VIRTUAL_OFFSET (0 Real SOL).

    const points = [0, 10, 50, 100, 500, 1000, 2500, 5000]; // SOL Liquidty

    // We iterate to find Shares at these SOL levels
    for (const sol of points) {
        // Inverse Cost Formula: Shares = sqrt( 2*K*SolLamports + Offset^2 )
        const targetLamports = sol * 1_000_000_000;
        const sAtTarget = Math.sqrt(2 * targetLamports * K + Math.pow(VIRTUAL_OFFSET, 2));
        const price = calculatePrice(sAtTarget);
        console.log(`${sol.toString().padEnd(9)} | ${(sAtTarget / 1e9).toFixed(2).padEnd(10)}B | ${price.toFixed(8)}`);
    }

    // 2. ROI Scenarios
    console.log("\n💰 [ROI Scenarios]");

    // Scenario A: Early Adopter (1 SOL at 0 TVL)
    const earlyIn = 1 * 1e9;
    const sharesEarlyStart = VIRTUAL_OFFSET;
    const sharesEarlyEnd = calculateSharesFromSol(earlyIn, sharesEarlyStart);
    const sharesReceivedEarly = sharesEarlyEnd - sharesEarlyStart;
    const priceEntryEarly = earlyIn / sharesReceivedEarly; // Avg Price

    console.log(`\n🐻 Early Adopter (1 SOL @ 0 TVL):`);
    console.log(`   - Shares Received: ${sharesReceivedEarly.toLocaleString()}`);
    console.log(`   - Avg Entry Price: ${(priceEntryEarly / 1e9).toFixed(9)} SOL`);

    // Scenario B: Whale (100 SOL at 500 TVL)
    const vaultStart = 500 * 1e9;
    const sharesWhaleStart = Math.sqrt(2 * vaultStart * K + Math.pow(VIRTUAL_OFFSET, 2));

    const whaleIn = 100 * 1e9;
    const sharesWhaleEnd = calculateSharesFromSol(whaleIn, sharesWhaleStart);
    const sharesReceivedWhale = sharesWhaleEnd - sharesWhaleStart;
    const priceEntryWhale = whaleIn / sharesReceivedWhale;

    console.log(`\n🐳 Whale (100 SOL @ 500 TVL):`);
    console.log(`   - Shares Received: ${sharesReceivedWhale.toLocaleString()}`);
    console.log(`   - Avg Entry Price: ${(priceEntryWhale / 1e9).toFixed(9)} SOL`);

    // Multiplier Comparison (Price Sensitivity)
    const priceRatio = priceEntryWhale / priceEntryEarly;
    console.log(`\n⚖️ Price Multiplier: The Whale pays ${priceRatio.toFixed(2)}x more per share than the Early Adopter.`);

    // Accumulation Phase Check
    const startPrice = calculatePrice(VIRTUAL_OFFSET);
    const priceAt50SOL = calculatePrice(Math.sqrt(2 * 50e9 * K + Math.pow(VIRTUAL_OFFSET, 2)));
    const change = ((priceAt50SOL - startPrice) / startPrice) * 100;
    console.log(`\n📉 Accumulation Phase: 0 -> 50 SOL moves price by ${change.toFixed(2)}%`);
}

runSimulation();
