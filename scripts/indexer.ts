
import * as anchor from "@project-serum/anchor";
import { Program, BN } from "@project-serum/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { supabase } from "../lib/supabase";
import idl from "../lib/idl/djinn_market.json";
import * as fs from 'fs';
import * as path from 'path';

// Setup Connection
const ANCHOR_PROVIDER_URL = "https://api.devnet.solana.com";
const connection = new Connection(ANCHOR_PROVIDER_URL, "confirmed");
const PROGRAM_ID = new PublicKey(idl.metadata.address);

// Mock Wallet for read-only program
const wallet = {
    publicKey: PublicKey.default,
    signTransaction: async (tx: any) => tx,
    signAllTransactions: async (txs: any[]) => txs,
};

const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: "confirmed" });
const program = new Program(idl as any, PROGRAM_ID, provider);

console.log("---------------------------------------------------");
console.log("🚀 DJINN REAL-TIME INDEXER STARTED");
console.log(`📡 Listening to Program: ${PROGRAM_ID.toBase58()}`);
console.log("---------------------------------------------------");

// 1. Listen for MarketCreated
program.addEventListener("MarketCreated", async (event, slot) => {
    console.log(`[EVENT] MarketCreated at Slot ${slot}`);
    const { market, creator, title } = event;
    const slug = title.toLowerCase().replace(/ /g, "-").replace(/[^\w-]/g, "") + "-" + Date.now().toString().slice(-4);

    const { error } = await supabase.from("markets").upsert({
        slug: slug,
        title: title,
        creator_wallet: creator.toBase58(),
        market_pda: market.toBase58(),
        resolved: false,
        created_at: new Date().toISOString()
    });

    if (error) console.error("❌ Error indexing MarketCreated:", error);
    else console.log(`✅ Indexed Market: ${title} (${slug})`);
});

// 2. Listen for Trade (Buy & Sell)
program.addEventListener("Trade", async (event, slot) => {
    console.log(`[EVENT] Trade at Slot ${slot}`);
    const { market, user, isBuy, side, solAmount, sharesAmount, feeTotal, priceE9 } = event;

    // Convert side enum to string
    const sideStr = side.yes ? "YES" : "NO";
    const solValue = Number(solAmount) / 1_000_000_000;
    const priceValue = Number(priceE9) / 1_000_000_000;

    // A. Add to Activity Feed
    const { error: actErr } = await supabase.from("activity").insert({
        wallet_address: user.toBase58(),
        market_pda: market.toBase58(),
        action: sideStr,
        sol_amount: solValue,
        shares: Number(sharesAmount) / 1_000_000_000,
        amount: solValue * 20, // Mock USD approx for UI
        created_at: new Date().toISOString()
    });

    // B. Update Live Price in market_data
    // Find market slug first
    const { data: mData } = await supabase.from("markets").select("slug").eq("market_pda", market.toBase58()).single();
    if (mData) {
        // Update Price and increment Volume
        const { error: priceErr } = await supabase.rpc('update_market_stats', {
            market_slug: mData.slug,
            new_price: priceValue,
            add_volume: solValue
        });
        if (priceErr) console.error("❌ Error updating stats:", priceErr);
    }

    if (actErr) console.error("❌ Error indexing Trade:", actErr);
    else console.log(`✅ Indexed ${isBuy ? "BUY" : "SELL"} by ${user.toBase58().slice(0, 6)}...`);
});

// 3. Listen for Resolution
program.addEventListener("MarketResolved", async (event, slot) => {
    console.log(`[EVENT] MarketResolved at Slot ${slot}`);
    const { market, outcome } = event;
    const outcomeStr = outcome.yes ? "YES" : outcome.no ? "NO" : "VOID";

    const { error } = await supabase.from("markets")
        .update({ resolved: true, winning_outcome: outcomeStr })
        .eq("market_pda", market.toBase58());

    if (error) console.error("❌ Error indexing Resolution:", error);
});

// Keep process alive
process.stdin.resume();
