
const VIRTUAL_OFFSET = 1_000_000_000; // 1B Shares
const K = 375_000_000_000_000; // Curve Constant

function getPrice(shares: number): number {
    return shares / K;
}

function getSharesFromVault(sol: number): number {
    // S = sqrt(2 * K * lamports + Offset^2)
    const lamports = sol * 1e9;
    return Math.sqrt(2 * lamports * K + Math.pow(VIRTUAL_OFFSET, 2));
}

function getSolFromShares(shares: number): number {
    // Sol = (S^2 - Offset^2) / (2K)
    return (Math.pow(shares, 2) - Math.pow(VIRTUAL_OFFSET, 2)) / (2 * K * 1e9);
}

function runStressTest() {
    console.log("🔥 DJINN 'Golden Mutant' Verticality Stress Test");
    console.log("-----------------------------------------------");

    // PHASE 1: ANCHOR PHASE (0.1 SOL x 100 buys)
    console.log("\n⚓ PHASE 1: ANCHOR STABILITY");
    let currentVault = 0;
    let startPrice = getPrice(VIRTUAL_OFFSET);
    let maxJump = 0;

    for (let i = 0; i < 100; i++) {
        const prePrice = getPrice(getSharesFromVault(currentVault));
        currentVault += 0.1;
        const postPrice = getPrice(getSharesFromVault(currentVault));
        const jump = ((postPrice - prePrice) / prePrice) * 100;
        if (jump > maxJump) maxJump = jump;
    }
    const endAnchorPrice = getPrice(getSharesFromVault(currentVault));
    const totalAnchorChange = ((endAnchorPrice - startPrice) / startPrice) * 100;

    console.log(`- Buys: 100 x 0.1 SOL (Total 10 SOL)`);
    console.log(`- Start Price: ${startPrice.toFixed(9)} SOL`);
    console.log(`- End Price:   ${endAnchorPrice.toFixed(9)} SOL`);
    console.log(`- Max Single Jump: ${maxJump.toFixed(4)}%`);
    console.log(`- Total Price Move: ${totalAnchorChange.toFixed(2)}%`);
    console.log(`RESULT: ${maxJump < 1.0 ? "PASS ✅ (Stable)" : "FAIL ❌ (Volatile)"}`);

    // PHASE 2: SNOWBALL (500 SOL INJECTION)
    console.log("\n❄️ PHASE 2: SNOWBALL EFFECT");
    const phase2StartVault = currentVault; // 10 SOL
    const phase2EndVault = phase2StartVault + 500;
    const priceAfterSnowball = getPrice(getSharesFromVault(phase2EndVault));

    // ROI for Phase 1 Entrant (Avg entry ~0.005 SOL)
    // Current Value = New Price / Avg Entry
    // Approx Avg Entry Phase 1 = (0.0026 + 0.0073) / 2 = ~0.005
    const avgEntryPhase1 = (startPrice + endAnchorPrice) / 2;
    const multiplier = priceAfterSnowball / avgEntryPhase1;

    console.log(`- Injection: 500 SOL`);
    console.log(`- New TVL: ${phase2EndVault.toFixed(2)} SOL`);
    console.log(`- New Price: ${priceAfterSnowball.toFixed(6)} SOL`);
    console.log(`- Phase 1 Entrant Multiplier: ${multiplier.toFixed(1)}x`);
    console.log(`RESULT: ${multiplier > 10 ? "PASS ✅ (Wake Up Confirmed)" : "FAIL ❌ (Dormant)"}`);

    // PHASE 3: VERTICAL WALL (5000 SOL)
    console.log("\nwalls PHASE 3: VERTICAL WALL (5000 SOL)");
    const wallVault = 5000;
    const wallShares = getSharesFromVault(wallVault);
    const wallPrice = getPrice(wallShares); // ~0.16 SOL

    console.log(`- TVL: ${wallVault} SOL`);
    console.log(`- Price: ${wallPrice.toFixed(6)} SOL`);

    // CRITICAL QUESTION: How much SOL to move price 10%?
    // Target Price = Current * 1.10
    const targetPrice = wallPrice * 1.10;
    // Target Shares = TargetPrice * K
    const targetShares = targetPrice * K;
    // Target Vault = (Shares^2 - Offset^2) / 2K
    const targetVault = getSolFromShares(targetShares);
    const requiredSol = targetVault - wallVault;

    console.log(`\n❓ CRITICAL QUESTION: Cost to move price +10% at 5000 SOL TVL?`);
    console.log(`- Current Price: ${wallPrice.toFixed(6)}`);
    console.log(`- Target Price: ${targetPrice.toFixed(6)}`);
    console.log(`- Required Capital: ${requiredSol.toFixed(2)} SOL ($${(requiredSol * 150).toLocaleString()})`);

    const elasticity = requiredSol / 5000; // % of TVL needed to move 10%
    console.log(`- Requires adding ${((requiredSol / wallVault) * 100).toFixed(1)}% of Total Liquidity.`);

    // Check if prohibitive (Subjective, but implies high capital density)
    console.log(`RESULT: To move price 10%, you need ${requiredSol.toFixed(0)} SOL.`);
    console.log("This confirms the 'Saturation' mechanic. Late movers fight a heavy wall.");
}

runStressTest();
