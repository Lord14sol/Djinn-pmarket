
const VIRTUAL_OFFSET = 1_000_000_000; // 1B Shares
const K = 375_000_000_000_000; // Curve Constant
const ENTRY_FEE = 0.01;
const EXIT_FEE = 0.01;

// State
let totalShares = VIRTUAL_OFFSET;
let vaultSol = 0;
let treasuryFees = 0;

function buy(solAmount: number): number {
    const fee = solAmount * ENTRY_FEE;
    treasuryFees += fee;
    const netSol = solAmount - fee;
    const lamports = netSol * 1e9;

    // S_new = sqrt(S_old^2 + 2 * NetIn * K)
    const sOldSq = Math.pow(totalShares, 2);
    const term = 2 * lamports * K;
    const sNew = Math.sqrt(sOldSq + term);

    const sharesMinted = sNew - totalShares;
    totalShares = sNew;
    vaultSol += netSol;

    return sharesMinted;
}

function sell(sharesAmount: number): number {
    // S_new = S_old - shares
    const sNew = totalShares - sharesAmount;

    // Cost Formula: Cost = S^2 / 2K
    const costOld = Math.pow(totalShares, 2) / (2 * K);
    const costNew = Math.pow(sNew, 2) / (2 * K);

    const grossRefundLamports = costOld - costNew;
    const grossRefundSol = grossRefundLamports / 1e9;

    const fee = grossRefundSol * EXIT_FEE;
    treasuryFees += fee;

    const netRefund = grossRefundSol - fee;

    totalShares = sNew;
    vaultSol -= netRefund + fee; // Vault pays net to user + fee to treasury

    return netRefund;
}

function getPrice(): number {
    // P = S / K
    return totalShares / K;
}

function runRealismTest() {
    console.log("🏛️ DJINN MARKET REALISM TEST (To $1M / 7000 SOL)");
    console.log("-----------------------------------------------");

    // 1. PIONEER (Insider) - 5 SOL @ 0 TVL
    console.log("\n👤 STEP 1: THE PIONEER (Insider)");
    const pioneerIn = 5;
    const pioneerShares = buy(pioneerIn);
    console.log(`- Buys: ${pioneerIn} SOL`);
    console.log(`- Shares: ${pioneerShares.toLocaleString()}`);
    console.log(`- Price: ${getPrice().toFixed(6)} SOL`);
    console.log(`- Vault: ${vaultSol.toFixed(2)} SOL`);

    // 2. RETAIL WAVE (Hype) - 50 Wallets (~100 SOL TVL)
    console.log("\n🌊 STEP 2: RETAIL WAVE (Hype)");
    let retailSol = 0;
    for (let i = 0; i < 50; i++) {
        // Random between 0.5 and 2.0 SOL
        const amount = 0.5 + Math.random() * 1.5;
        buy(amount);
        retailSol += amount;
    }
    console.log(`- 50 Wallets Injected: ~${retailSol.toFixed(2)} SOL`);
    console.log(`- Price: ${getPrice().toFixed(6)} SOL`);
    console.log(`- Vault: ${vaultSol.toFixed(2)} SOL`);

    // 3. WHALE (FOMO) - 500 SOL
    console.log("\n🐳 STEP 3: INSTITUTIONAL WHALE (FOMO)");
    const whaleIn = 500;
    const whaleShares = buy(whaleIn);
    console.log(`- Buys: ${whaleIn} SOL`);
    console.log(`- Shares: ${whaleShares.toLocaleString()}`);
    console.log(`- Price: ${getPrice().toFixed(6)} SOL`);
    console.log(`- Vault: ${vaultSol.toFixed(2)} SOL`);

    // 4. MAINSTREAM (Ceiling) - Fill to 7,000 SOL
    console.log("\n🚀 STEP 4: MAINSTREAM ADOPTION (Target 7,000 SOL)");
    const targetVault = 7000;
    const needed = targetVault - vaultSol;
    buy(needed); // Simulate mass aggregation

    console.log(`- Mass Injection: ${needed.toFixed(2)} SOL`);
    console.log(`- FINAL VAULT: ${vaultSol.toFixed(2)} SOL (~$1M USD)`);
    console.log(`- FINAL PRICE: ${getPrice().toFixed(6)} SOL`);
    console.log(`- TOTAL SHARES: ${totalShares.toLocaleString()}`);

    // --- REPORT METRICS ---
    console.log("\n📊 [FINAL REPORT]");

    // 1. Pioneer ROI
    // To calc value, simulate selling ALL shares
    // (We won't actually sell to update state yet, just calc)
    // Gross Refund = (S_sq - (S-Shares)^2) / 2K
    const pShares = pioneerShares;
    const costCurrent = Math.pow(totalShares, 2) / (2 * K);
    const sharesAfterSell = totalShares - pShares;
    const costAfter = Math.pow(sharesAfterSell, 2) / (2 * K);
    const grossValLamports = costCurrent - costAfter;
    const grossValSol = grossValLamports / 1e9;
    const netValSol = grossValSol * (1 - EXIT_FEE);

    const roi = netValSol / pioneerIn;

    console.log(`\n1️⃣ PIONEER ROI (5 SOL Entry)`);
    console.log(`- Portfolio Value: ${netValSol.toFixed(2)} SOL ($${(netValSol * 150).toLocaleString()})`);
    console.log(`- ROI Multiplier: ${roi.toFixed(2)}x`);
    console.log(`Status: ${roi > 10 ? "MILLIONAIRE 🟢" : "REKT 🔴"}`);

    // 2. Liquidity Extraction (50% Sell)
    console.log(`\n2️⃣ EXIT LIQUIDITY TEST (Pioneer Dumps 50%)`);
    const sharesToDump = pioneerShares * 0.5;
    const preDumpPrice = getPrice();
    const solExtracted = sell(sharesToDump);
    const postDumpPrice = getPrice();
    const priceDrop = ((preDumpPrice - postDumpPrice) / preDumpPrice) * 100;

    console.log(`- Sold 50% Shares: ${sharesToDump.toLocaleString()}`);
    console.log(`- SOL Extracted: ${solExtracted.toFixed(2)} SOL`);
    console.log(`- Price Impact: -${priceDrop.toFixed(4)}%`);
    console.log("Verdict: Market absorbed the dump? " + (priceDrop < 5 ? "YES (Stable)" : "NO (Crash)"));

    // 3. G1 Fees
    console.log(`\n3️⃣ G1 TREASURY REVENUE`);
    console.log(`- Total Fees Collected: ${treasuryFees.toFixed(2)} SOL ($${(treasuryFees * 150).toLocaleString()})`);

    // 4. S-Curve Visual Check logic
    // (We verify the prices from the steps above)
    // Step 1 (5 SOL): Price ~?
    // Step 3 (600 SOL): Price ~?
    // Step 4 (7000 SOL): Price ~?
}

runRealismTest();
