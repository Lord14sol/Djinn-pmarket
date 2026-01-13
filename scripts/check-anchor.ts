import * as anchor from "@project-serum/anchor";
console.log("Keys:", Object.keys(anchor));
console.log("Default Keys:", Object.keys(anchor.default || {}));
try {
    const BN = anchor.BN;
    console.log("BN from anchor:", BN);
} catch (e) { console.log("No BN at anchor.BN"); }

try {
    console.log("BN from default:", (anchor.default as any).BN);
} catch (e) { }

import BN from "bn.js";
console.log("BN from bn.js:", BN);
