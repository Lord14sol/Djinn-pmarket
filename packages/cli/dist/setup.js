#!/usr/bin/env node
"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
// @ts-ignore
const prompts_1 = __importDefault(require("prompts"));
const web3_js_1 = require("@solana/web3.js");
// @ts-ignore
const bs58_1 = __importDefault(require("bs58"));
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
async function main() {
    console.log(DJINN_BANNER);
    console.log('  Welcome to Djinn! Let\'s set up your AI trading bot.\n');
    // ─── Step 0: Prerequisites ──────────────────────────────────────────────
    const nodeVersion = parseInt(process.version.slice(1).split('.')[0]);
    if (nodeVersion < 22) {
        console.warn(`⚠️  Warning: OpenClaw recommends Node.js 22+. You satisfy v${process.version}.`);
    }
    console.log('🔍 Checking OpenClaw Engine...');
    try {
        (0, child_process_1.execSync)('which openclaw', { stdio: 'ignore' });
        console.log('✅ OpenClaw is installed.');
    }
    catch (e) {
        console.error('❌ OpenClaw (clawd) not found.');
        console.error('   Please install it manually from: https://openclaw.ai');
        console.error('   Then run this setup again.');
        process.exit(1);
    }
    // ─── Step 1: Bot Configuration ──────────────────────────────────────────
    console.log('\n📋 Step 1: Bot Configuration\n');
    const response = await (0, prompts_1.default)([
        {
            type: 'text',
            name: 'botName',
            message: 'Bot name (max 32 chars):',
            validate: (value) => value.length > 0 && value.length <= 32 ? true : 'Name must be 1-32 characters'
        },
        {
            type: 'select',
            name: 'category',
            message: 'Select Strategy Category:',
            choices: CATEGORIES.map((c, i) => ({ title: c, value: i })),
            initial: 0
        },
        {
            type: 'select',
            name: 'network',
            message: 'Select Network:',
            choices: [
                { title: 'Devnet (Testing)', value: 'devnet' },
                { title: 'Mainnet (Real Money)', value: 'mainnet' }
            ],
            initial: 0
        },
        {
            type: 'text',
            name: 'rpcUrl',
            message: 'RPC URL (Leave empty for default):',
        },
        {
            type: 'text',
            name: 'webhookUrl',
            message: 'Webhook URL (Optional):',
        }
    ], {
        onCancel: () => {
            console.log('\n❌ Setup cancelled.');
            process.exit(0);
        }
    });
    const botName = response.botName;
    const category = response.category;
    const network = response.network;
    const defaultRpc = network === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com';
    const rpcUrl = response.rpcUrl || defaultRpc;
    const webhookUrl = response.webhookUrl;
    // ─── Step 4: Generate Wallet ──────────────────────────────────────────
    console.log('\n🔑 Step 4: Generating Bot Wallet\n');
    const djinnDir = path.join(process.env.HOME || '.', '.djinn');
    if (!fs.existsSync(djinnDir)) {
        fs.mkdirSync(djinnDir, { recursive: true });
    }
    const walletPath = path.join(djinnDir, 'bot-wallet.json');
    if (fs.existsSync(walletPath)) {
        console.log(`  ⚠️  Wallet already exists at ${walletPath}`);
        const { overwrite } = await (0, prompts_1.default)({
            type: 'confirm',
            name: 'overwrite',
            message: 'Overwrite existing wallet?',
            initial: false
        });
        if (!overwrite) {
            console.log('  Using existing wallet.');
        }
        else {
            generateWallet(walletPath);
        }
    }
    else {
        generateWallet(walletPath);
    }
    // ─── Step 4.5: Auto-Fund (The Magic) ──────────────────────────────────
    if (network === 'devnet') {
        console.log('\n💸 Step 4.5: Auto-Funding Wallet (Devnet Magic)\n');
        const fileContent = fs.readFileSync(walletPath, 'utf-8');
        const secretKey = new Uint8Array(JSON.parse(fileContent));
        const kp = web3_js_1.Keypair.fromSecretKey(secretKey);
        const connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        try {
            const balance = await connection.getBalance(kp.publicKey);
            if (balance < 1 * web3_js_1.LAMPORTS_PER_SOL) {
                console.log('  💧 Requesting 5 SOL Airdrop...');
                const signature = await connection.requestAirdrop(kp.publicKey, 5 * web3_js_1.LAMPORTS_PER_SOL);
                await connection.confirmTransaction(signature);
                const newBalance = await connection.getBalance(kp.publicKey);
                console.log(`  ✅ Airdrop successful! New Balance: ${newBalance / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            }
            else {
                console.log(`  ✅ Wallet already funded: ${balance / web3_js_1.LAMPORTS_PER_SOL} SOL`);
            }
        }
        catch (e) {
            console.log('  ⚠️  Airdrop failed (Rate limited?). You may need to use a faucet: https://faucet.solana.com');
        }
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
        (0, child_process_1.execSync)('npm install @djinn/sdk', { stdio: 'inherit' });
        console.log('  ✅ SDK installed');
    }
    catch {
        console.log('  ⚠️  SDK not yet published. You can install it later.');
    }
    // ─── Step 7: Install Agent Skill ──────────────────────────────────────
    console.log('\n🧠 Step 7: Installing @djinn/agent-skill (The Brain)\n');
    try {
        (0, child_process_1.execSync)('npm install @djinn/agent-skill', { stdio: 'inherit' });
        console.log('  ✅ Agent Skill installed');
    }
    catch {
        console.log('  ⚠️  Skill package not found (Run locally if testing).');
    }
    // ─── Done ──────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(60));
    console.log('\n🎉 Setup complete! Next steps:\n');
    if (network === 'devnet') {
        console.log('  1. Fund your bot wallet with devnet SOL:');
        console.log(`     solana airdrop 10 ${walletPath} --url devnet\n`);
    }
    else {
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
function generateWallet(walletPath) {
    const kp = web3_js_1.Keypair.generate();
    const secretKey = Array.from(kp.secretKey);
    fs.writeFileSync(walletPath, JSON.stringify(secretKey));
    fs.chmodSync(walletPath, 0o600); // Owner read/write only
    console.log(`  ✅ New wallet generated: ${walletPath}`);
    console.log(`  📍 Public Key: ${kp.publicKey.toBase58()}`);
    const bs58Key = bs58_1.default.encode(kp.secretKey);
    console.log(`  🔐 Private Key (BS58):`);
    console.log(`\n${bs58Key}\n`);
    // Try to copy to clipboard on Mac
    if (process.platform === 'darwin') {
        try {
            (0, child_process_1.execSync)(`echo "${bs58Key}" | pbcopy`);
            console.log('  📋 (Copied to clipboard!)');
        }
        catch (e) {
            // Ignore if pbcopy fails
        }
    }
    console.log('  ⚠️  BACK UP THIS KEY! If lost, your stake is gone.');
}
main().catch(console.error);
