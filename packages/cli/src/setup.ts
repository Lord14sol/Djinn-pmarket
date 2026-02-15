#!/usr/bin/env node

/**
 * @djinn/setup — Quick setup CLI for Djinn AI bot developers
 *
 * Usage:
 *   npx @djinn/setup
 *
 * What it does:
 *   1. Generates a Solana keypair for the bot
 *   2. Creates .env config with Djinn settings
 *   3. Installs @djinn/sdk
 *   4. Prints next steps (fund wallet + register bot)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as readline from 'readline';
import { Keypair } from '@solana/web3.js';

const DJINN_BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║     ██████╗      ██╗██╗███╗   ██╗███╗   ██╗                ║
║     ██╔══██╗     ██║██║████╗  ██║████╗  ██║                ║
║     ██║  ██║     ██║██║██╔██╗ ██║██╔██╗ ██║                ║
║     ██║  ██║██   ██║██║██║╚██╗██║██║╚██╗██║                ║
║     ██████╔╝╚█████╔╝██║██║ ╚████║██║ ╚████║                ║
║     ╚═════╝  ╚════╝ ╚═╝╚═╝  ╚═══╝╚═╝  ╚═══╝                ║
║                                                              ║
║              AI Bot Setup Wizard v1.0.0                      ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

const CATEGORIES = ['All', 'Sports', 'Crypto', 'Politics', 'Other'];
const DJINN_PROGRAM_ID = 'A8pVMgP6vwjGqcbYh1WGWDjXq9uwQRoF9Lz1siLmD7nm';

async function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

async function main() {
    console.log(DJINN_BANNER);
    console.log('  Welcome to Djinn! Let\'s set up your AI trading bot.\n');

    // ─── Step 1: Bot Details ────────────────────────────────────────────────
    console.log('📋 Step 1: Bot Details\n');

    const botName = await prompt('  Bot name (max 32 chars): ');
    if (!botName || botName.length > 32) {
        console.error('❌ Bot name must be 1-32 characters');
        process.exit(1);
    }

    console.log('\n  Categories:');
    CATEGORIES.forEach((c, i) => console.log(`    ${i}. ${c}`));
    const categoryStr = await prompt('\n  Strategy category (0-4): ');
    const category = parseInt(categoryStr);
    if (isNaN(category) || category < 0 || category > 4) {
        console.error('❌ Invalid category');
        process.exit(1);
    }

    // ─── Step 2: Network ──────────────────────────────────────────────────
    console.log('\n📡 Step 2: Network\n');

    const networkStr = await prompt('  Network (devnet/mainnet) [devnet]: ');
    const network = (networkStr === 'mainnet' ? 'mainnet' : 'devnet') as 'devnet' | 'mainnet';

    const defaultRpc = network === 'devnet'
        ? 'https://api.devnet.solana.com'
        : 'https://api.mainnet-beta.solana.com';

    const rpcUrl = (await prompt(`  RPC URL [${defaultRpc}]: `)) || defaultRpc;

    // ─── Step 3: Webhook (Optional) ────────────────────────────────────────
    console.log('\n🔔 Step 3: Webhook (Optional)\n');

    const webhookUrl = await prompt('  Webhook URL (HTTPS, or press Enter to skip): ');

    // ─── Step 4: Generate Wallet ──────────────────────────────────────────
    console.log('\n🔑 Step 4: Generating Bot Wallet\n');

    const djinnDir = path.join(process.env.HOME || '.', '.djinn');
    if (!fs.existsSync(djinnDir)) {
        fs.mkdirSync(djinnDir, { recursive: true });
    }

    const walletPath = path.join(djinnDir, 'bot-wallet.json');

    if (fs.existsSync(walletPath)) {
        console.log(`  ⚠️  Wallet already exists at ${walletPath}`);
        const overwrite = await prompt('  Overwrite? (y/N): ');
        if (overwrite.toLowerCase() !== 'y') {
            console.log('  Using existing wallet.');
        } else {
            generateWallet(walletPath);
        }
    } else {
        generateWallet(walletPath);
    }

    // ─── Step 5: Create .env ──────────────────────────────────────────────
    console.log('\n📝 Step 5: Writing Configuration\n');

    const envContent = `# Djinn AI Bot Configuration
# Generated by @djinn/setup

DJINN_RPC_URL=${rpcUrl}
DJINN_BOT_KEYPAIR_PATH=${walletPath}
DJINN_API_URL=${network === 'devnet' ? 'http://localhost:3000' : 'https://djinn.world'}
DJINN_PROGRAM_ID=${DJINN_PROGRAM_ID}
DJINN_BOT_NAME=${botName}
DJINN_STRATEGY_CATEGORY=${category}
DJINN_NETWORK=${network}
${webhookUrl ? `DJINN_WEBHOOK_URL=${webhookUrl}` : '# DJINN_WEBHOOK_URL=https://your-bot.example.com/djinn'}
`;

    const envPath = path.join(process.cwd(), '.env.djinn');
    fs.writeFileSync(envPath, envContent);
    console.log(`  ✅ Config written to ${envPath}`);

    // ─── Step 6: Install SDK ──────────────────────────────────────────────
    console.log('\n📦 Step 6: Installing @djinn/sdk\n');

    try {
        execSync('npm install @djinn/sdk', { stdio: 'inherit' });
        console.log('  ✅ SDK installed');
    } catch {
        console.log('  ⚠️  SDK not yet published. You can install it later.');
    }

    // ─── Done ──────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('\n🎉 Setup complete! Next steps:\n');

    if (network === 'devnet') {
        console.log('  1. Fund your bot wallet with devnet SOL:');
        console.log(`     solana airdrop 10 ${walletPath} --url devnet\n`);
    } else {
        console.log('  1. Fund your bot wallet with 11+ SOL:');
        console.log(`     (10 SOL stake + gas fees)\n`);
    }

    console.log('  2. Register your bot on-chain:');
    console.log('     import { DjinnSDK } from "@djinn/sdk";');
    console.log('     const djinn = new DjinnSDK();');
    console.log(`     // Then call register_bot instruction\n`);

    console.log('  3. Start trading:');
    console.log('     const markets = await djinn.listMarkets({ category: "crypto" });');
    console.log('     // Your bot\'s strategy goes here!\n');

    console.log('  📖 Full docs: https://docs.djinn.world/bots');
    console.log('  💬 Discord: https://discord.gg/djinn\n');
}

function generateWallet(walletPath: string) {
    const kp = Keypair.generate();
    const secretKey = Array.from(kp.secretKey);
    fs.writeFileSync(walletPath, JSON.stringify(secretKey));
    fs.chmodSync(walletPath, 0o600); // Owner read/write only
    console.log(`  ✅ New wallet generated: ${walletPath}`);
    console.log(`  📍 Public Key: ${kp.publicKey.toBase58()}`);
    console.log('  ⚠️  BACK UP THIS FILE! If lost, your stake is gone.');
}

main().catch(console.error);
