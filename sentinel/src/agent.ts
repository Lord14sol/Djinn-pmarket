import { loadVault, VaultKeys } from '../config/vault.ts';
import { BlockchainClient } from './blockchain.ts';
import { MarketQueue } from './queue.ts';
import { ConsensusEngine } from './consensus.ts';
import { Logger } from './logger.ts';
import { WebScraper } from './scraper.ts';
import type { Market, ResolutionResult, AIResponse, SentinelConfig } from '../types/index.ts';
import { AGENT_CONFIG } from '../config/models.ts';
import { Keypair, PublicKey } from '@solana/web3.js';

export class SentinelAgent {
    private keys: VaultKeys;
    private blockchain: BlockchainClient;
    private queue: MarketQueue;
    private consensus: ConsensusEngine;
    private logger: Logger;
    private scraper: WebScraper;

    // Heartbeat Tracking: Map<MarketAddress, LastCheckTimestamp>
    private heartbeats: Map<string, number> = new Map();

    constructor() {
        this.keys = loadVault();
        this.blockchain = new BlockchainClient(this.keys);
        this.queue = new MarketQueue();
        this.consensus = new ConsensusEngine();
        this.logger = new Logger();
        this.scraper = new WebScraper();
    }

    async start() {
        console.log("🛡️ SENTINEL SHIELD ACTIVATED: 24/7 Watch");

        setInterval(() => this.runSentinelCycle(), AGENT_CONFIG.CHECK_INTERVAL_MS);

        // Start Resolution Workers
        this.runWorkerLoop();

        // Initial Run
        this.runSentinelCycle();
    }

    private async runWorkerLoop() {
        while (true) {
            try {
                await this.queue.processNext(async (m: Market) => this.layer1Detection(m));
            } catch (e) {
                console.error("Worker Error:", e);
            }
            await new Promise(r => setTimeout(r, 1000));
        }
    }

    private async runSentinelCycle() {
        try {
            // 1. Fetch ALL Markets
            const markets = await this.blockchain.scanMarkets();

            // 2. Filter & Process
            for (const market of markets) {
                // LAYER 1: New Resolutions (OPEN -> PROPOSED)
                const isAlreadyTracking = this.heartbeats.has(market.address.toBase58());

                if (market.resolutionTime <= Date.now() / 1000 && !market.isResolved && !isAlreadyTracking) {
                    // Add to Queue for processing
                    this.queue.add(market);
                }

                // LAYER 4: Heartbeat & Finalization (PROPOSED -> RESOLVED/FROZEN)
                if (isAlreadyTracking) {
                    await this.layer4Heartbeat(market);
                }
            }

        } catch (e) {
            console.error("Sentinel Cycle Error:", e);
        }
    }

    /**
     * LAYER 1: Initial Link Detection + Consensus
     */
    private async layer1Detection(market: Market): Promise<ResolutionResult> {
        console.log(`🔍 Layer 1 Scanning: ${market.question}`);
        const linkData = await this.scraper.fetchAndParse(market.sourceLink);

        const aiResult = await this.consensus.executeLayer1Forge(market.question, linkData, market.sourceLink);

        if (aiResult.answer !== 'UNCERTAIN') {
            const outcome = aiResult.answer === 'YES' ? 'Yes' : 'No';
            console.log(`⚡ Proposal: ${outcome} (Conf: ${aiResult.confidence})`);

            // Execute Propose Transaction (TODO: update blockchain.ts to use propose_outcome)
            await this.blockchain.proposeOutcome(market.address, outcome);

            // Start Heartbeat Monitoring
            this.heartbeats.set(market.address.toBase58(), Date.now());

            return { market, finalOutcome: aiResult.answer, confidenceScore: aiResult.confidence, sourcesUsed: [aiResult], processingTimeMs: 0 };
        } else {
            console.log("⚠️ Layer 1 Uncertain. Retrying later.");
            return { market, finalOutcome: 'INCERTAIN', confidenceScore: 0, sourcesUsed: [], processingTimeMs: 0 };
        }
    }

    /**
     * LAYER 4: Heartbeat & Trinity
     */
    private async layer4Heartbeat(market: Market) {
        const lastCheck = this.heartbeats.get(market.address.toBase58()) || 0;
        const now = Date.now();

        // Check every 15 minutes (900,000 ms) - PROTOCOL HEARTBEAT
        if (now - lastCheck > 900_000) {
            console.log(`💓 Protocol Heartbeat (15m): ${market.question}`);

            // CAPA 2: Governance Check (AI vs Holders)
            const votes = await this.blockchain.getVoteTally(market.address);

            // LAYER 3: THE SEAL (Triple Verification)
            const seal = await this.consensus.executeLayer3Seal(market.question, market.sourceLink);

            // ESCALATION LOGIC: If Seal Fails OR Governance Conflicts
            // Conflict: AI Proposal (Capa 1) vs Majority Vote (Capa 2)
            if (seal.answer === 'UNCERTAIN' || votes.conflictWithAI) {
                console.error("🚨 SENTINEL SECURITY BREACH: ESCALATING TO G1 MANUAL REVIEW.");

                await this.reviewAndEscalate(market, seal, votes);

                // NOTA: No hacemos Freeze automático por petición del usuario.
                // El sistema marca el mercado para revisión manual de G1.
                this.heartbeats.delete(market.address.toBase58());
                return;
            }

            // Update Last Check
            this.heartbeats.set(market.address.toBase58(), now);
            console.log("✅ Heartbeat Stable. Seal Intact.");

            // CHECK FINALIZE (2 Hours = 7,200,000 ms)
            if (now - lastCheck > 7200000) {
                console.log("🏆 Finalizing Market.");
                await this.blockchain.finalizeService(market.address);
                this.heartbeats.delete(market.address.toBase58());
            }
        }
    }

    /**
     * REVIEW & ESCALATE
     * Sentinel reviews all Capas (1, 1.5, 2) when Seal (3) fails.
     */
    private async reviewAndEscalate(market: Market, sealResult: AIResponse, voteResult: any) {
        const report = `
        🛡️ SENTINEL ESCALATION REPORT 🛡️
        =================================
        Market: ${market.address.toBase58()}
        Title: ${market.question}
        
        [CAPA 1 & 1.5]: Initial Forge & Audit Result.
        [CAPA 2]: Governance Vote suggests ${voteResult.majority}. 
        [CAPA 3]: Seal Status is ${sealResult.answer} (${sealResult.reasoning}).
        
        [SENTINEL CONCLUSION]: 
        Conflict detected between Automated Intelligence (Capa 3) and previous layers (Capa 1/2).
        MARKET ESCALATED TO G1_MANUAL_REVIEW.
        =================================
        `;

        console.log(report);
        await this.logger.persistLog(market.address.toBase58(), {
            event: 'ESCALATION_TO_G1',
            details: report,
            context: { sealResult, voteResult }
        });
    }
}
