/**
 * CERBERUS ORCHESTRATOR
 * Main engine that coordinates 3-Dog verification
 * Polls every 3 minutes for new markets
 */

import { EventEmitter } from 'events';
import {
    MarketData,
    CerberusVerdict,
    DashboardMarket,
    DashboardState,
    CerberusConfig,
    DEFAULT_CONFIG
} from './types';
import { runCerberusValidation } from './engine';
import { DjinnClient, createDjinnClient } from './services/djinn-client';
import {
    checkTwitterMarket,
    extractTwitterMarketData,
    getPollingIntervalMs,
    TwitterMarketData,
    ResolutionReport,
} from './services/twitter-resolver';

export class CerberusOrchestrator extends EventEmitter {
    private config: CerberusConfig;
    private djinnClient: DjinnClient;
    private pollingInterval: NodeJS.Timeout | null = null;
    private isRunning: boolean = false;
    private processingQueue: Map<string, DashboardMarket> = new Map();
    private verifiedMarkets: Map<string, CerberusVerdict> = new Map();
    private dashboardState: DashboardState;

    // Twitter resolution tracking
    private twitterMarkets: Map<string, TwitterMarketData> = new Map();
    private twitterLastCheck: Map<string, number> = new Map();
    private twitterResolutionInterval: NodeJS.Timeout | null = null;

    constructor(config: Partial<CerberusConfig> = {}) {
        super();
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.djinnClient = createDjinnClient(this.config);
        this.dashboardState = this.initDashboardState();
    }

    private initDashboardState(): DashboardState {
        return {
            markets: [],
            lastUpdated: Date.now(),
            isPolling: false,
            processingQueue: [],
            stats: {
                totalMarkets: 0,
                verified: 0,
                flagged: 0,
                rejected: 0,
                pending: 0
            }
        };
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.log('[ORCHESTRATOR] Already running');
            return;
        }

        console.log('[ORCHESTRATOR] CERBERUS ORACLE - MARKET VERIFICATION SYSTEM');
        console.log(`[ORCHESTRATOR] Polling Interval: ${(this.config.pollingIntervalMs / 1000 / 60).toFixed(1)} minutes`);

        this.isRunning = true;
        this.dashboardState.isPolling = true;

        // Initial fetch
        await this.pollForNewMarkets();

        // Start polling interval
        this.pollingInterval = setInterval(
            () => this.pollForNewMarkets(),
            this.config.pollingIntervalMs
        );

        // Start Twitter resolution polling (every 5 min)
        this.twitterResolutionInterval = setInterval(
            () => this.pollTwitterMarkets(),
            5 * 60 * 1000
        );

        this.emit('started');
        console.log('[ORCHESTRATOR] Started - Polling for new markets...');
    }

    stop(): void {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        if (this.twitterResolutionInterval) {
            clearInterval(this.twitterResolutionInterval);
            this.twitterResolutionInterval = null;
        }
        this.isRunning = false;
        this.dashboardState.isPolling = false;
        this.emit('stopped');
        console.log('[ORCHESTRATOR] Stopped');
    }

    async pollForNewMarkets(): Promise<void> {
        console.log(`\n[ORCHESTRATOR] Polling for new markets... (${new Date().toLocaleTimeString()})`);

        try {
            const newMarkets = await this.djinnClient.fetchNewMarkets();

            if (newMarkets.length === 0) {
                console.log('[ORCHESTRATOR] No new markets found');
                return;
            }

            console.log(`[ORCHESTRATOR] Found ${newMarkets.length} new market(s) to verify`);

            for (const market of newMarkets) {
                await this.processMarket(market);
            }

            this.updateDashboardStats();
            this.emit('poll_complete', this.dashboardState);

        } catch (error) {
            console.error('[ORCHESTRATOR] Error polling for markets:', error);
            this.emit('error', error);
        }
    }

    async processMarket(market: MarketData): Promise<CerberusVerdict> {
        const startTime = Date.now();

        console.log(`\n${'='.repeat(60)}`);
        console.log(`CERBERUS 3-DOGS VALIDATION STARTING`);
        console.log(`Market: ${market.title}`);
        console.log(`ID: ${market.publicKey}`);
        console.log(`URL: ${market.sourceUrl}`);
        console.log(`${'='.repeat(60)}`);

        // Create dashboard market entry
        const dashboardMarket: DashboardMarket = {
            ...market,
            verificationStatus: 'pending_verification',
            currentLayer: 0,
            layerProgress: {
                layer1: 'pending',
                layer2: 'pending',
                layer3: 'pending'
            },
            checkmark: false,
            resolutionDate: null,
            aiDescription: null
        };

        this.processingQueue.set(market.publicKey, dashboardMarket);
        this.updateDashboard(dashboardMarket);

        // Run 3-Dogs Engine
        dashboardMarket.verificationStatus = 'layer1_processing';
        this.updateDashboard(dashboardMarket);

        const validation = await runCerberusValidation(market);
        const totalTime = Date.now() - startTime;

        // Map to CerberusVerdict
        const verdict: CerberusVerdict = {
            marketId: market.publicKey,
            marketTitle: market.title,
            timestamp: Date.now(),
            layer1: {
                passed: true,
                sourceAccessible: true,
                sourceContent: null,
                extractedFacts: [],
                newsArticles: [],
                socialMentions: [],
                hasEnoughInformation: true,
                summary: "3-Dogs Engine Complete",
                processingTime: 0
            },
            layer2: {
                passed: true,
                layer1Confirmed: true,
                isResolvable: true,
                hasClearOutcome: true,
                isObjective: true,
                hasVerifiableDate: true,
                suggestedResolutionDate: null,
                riskFlags: [],
                confidenceScore: validation.finalScore,
                reasoning: validation.dog2.report.reasoning,
                processingTime: 0
            },
            layer3: {
                passed: validation.finalStatus === 'VERIFIED',
                sourceIsReal: true,
                eventIsReal: true,
                sourceTrustworthy: true,
                dateIsValid: true,
                finalVerdict: validation.finalStatus === 'VERIFIED' ? 'APPROVED' : 'REJECTED',
                checkmarkEarned: validation.finalStatus === 'VERIFIED',
                generatedDescription: validation.dog3.report.reasoning,
                resolutionDate: '',
                category: market.category || 'other',
                reasoning: validation.dog3.report.reasoning,
                processingTime: 0
            },
            finalStatus: validation.finalStatus === 'VERIFIED' ? 'VERIFIED' : (validation.finalStatus === 'UNCERTAIN' ? 'FLAGGED' : 'REJECTED'),
            action: validation.finalStatus === 'VERIFIED' ? 'APPROVE' : (validation.finalStatus === 'UNCERTAIN' ? 'MANUAL_REVIEW' : 'REFUND_AND_DELETE'),
            checkmark: validation.finalStatus === 'VERIFIED',
            resolutionDate: null,
            aiDescription: validation.dog3.report.reasoning,
            category: market.category || 'other',
            totalProcessingTime: totalTime,
            verifiedAt: validation.finalStatus === 'VERIFIED' ? Date.now() : null
        };

        // Update dashboard
        dashboardMarket.verificationStatus = validation.finalStatus === 'VERIFIED' ? 'verified' : (validation.finalStatus === 'UNCERTAIN' ? 'flagged' : 'rejected');
        dashboardMarket.verdict = verdict;
        dashboardMarket.checkmark = verdict.checkmark;
        dashboardMarket.resolutionDate = verdict.resolutionDate;
        dashboardMarket.aiDescription = verdict.aiDescription;
        dashboardMarket.currentLayer = 3;
        dashboardMarket.layerProgress = {
            layer1: 'passed',
            layer2: 'passed',
            layer3: validation.finalStatus === 'VERIFIED' ? 'passed' : 'failed'
        };
        this.updateDashboard(dashboardMarket);

        // Store verdict
        this.verifiedMarkets.set(market.publicKey, verdict);

        // Send result to Djinn API
        await this.djinnClient.sendVerificationResult(verdict);

        if (verdict.action === 'REFUND_AND_DELETE') {
            await this.djinnClient.requestRefund(market.publicKey, verdict.layer3.reasoning);
        }

        console.log(`\nMarket: ${verdict.marketTitle}`);
        console.log(`Status: ${verdict.finalStatus} | Score: ${validation.finalScore}/100`);
        console.log(`Processing Time: ${verdict.totalProcessingTime}ms`);

        this.emit('market_processed', verdict);
        return verdict;
    }

    // --- Twitter Market Resolution ---

    registerTwitterMarket(market: MarketData & {
        target_username?: string;
        target_keyword?: string;
        target_tweet_id?: string;
        twitter_market_type?: string;
        metric_threshold?: number;
    }): void {
        const twitterData = extractTwitterMarketData(market);
        if (!twitterData) return;

        this.twitterMarkets.set(market.publicKey, twitterData);
        console.log(`[ORCHESTRATOR] Registered Twitter market: "${market.title}"`);
    }

    private async pollTwitterMarkets(): Promise<void> {
        if (this.twitterMarkets.size === 0) return;

        const now = Date.now();
        console.log(`\n[ORCHESTRATOR] Checking ${this.twitterMarkets.size} Twitter market(s)...`);

        for (const [marketId, twitterData] of this.twitterMarkets) {
            const lastCheck = this.twitterLastCheck.get(marketId) || 0;
            const interval = getPollingIntervalMs(twitterData);

            if (now - lastCheck < interval) continue;

            this.twitterLastCheck.set(marketId, now);

            try {
                const report = await checkTwitterMarket(twitterData);

                switch (report.result) {
                    case 'YES':
                    case 'NO':
                        console.log(`[ORCHESTRATOR] Twitter market RESOLVED: ${report.result}`);
                        console.log(`[ORCHESTRATOR] Evidence: ${report.evidence}`);
                        await this.resolveTwitterMarketOnDjinn(marketId, report);
                        this.twitterMarkets.delete(marketId);
                        this.twitterLastCheck.delete(marketId);
                        break;

                    case 'PENDING': {
                        const hoursLeft = (twitterData.expiresAt - now) / (1000 * 60 * 60);
                        console.log(`[ORCHESTRATOR] Market pending. ${hoursLeft.toFixed(1)}h left.`);
                        break;
                    }

                    case 'UNCERTAIN':
                        console.log(`[ORCHESTRATOR] Uncertain: ${report.evidence}`);
                        break;
                }
            } catch (err: any) {
                console.error(`[ORCHESTRATOR] Error checking market ${marketId}: ${err.message}`);
            }
        }
    }

    private async resolveTwitterMarketOnDjinn(
        marketId: string,
        report: ResolutionReport
    ): Promise<void> {
        try {
            const verdict: Partial<CerberusVerdict> = {
                marketId,
                timestamp: Date.now(),
                finalStatus: 'VERIFIED',
                action: 'APPROVE',
                checkmark: true,
                aiDescription: report.evidence,
                totalProcessingTime: 0,
                verifiedAt: Date.now(),
            };

            await this.djinnClient.sendVerificationResult(verdict as CerberusVerdict);

            this.emit('twitter_market_resolved', {
                marketId,
                result: report.result,
                evidence: report.evidence,
                isEarlyResolution: report.isEarlyResolution,
            });

            console.log(`[ORCHESTRATOR] Resolution sent to Djinn for market ${marketId}: ${report.result}`);
        } catch (err: any) {
            console.error(`[ORCHESTRATOR] Failed to send resolution to Djinn: ${err.message}`);
        }
    }

    // --- Public Getters ---

    getDashboardState(): DashboardState {
        return this.dashboardState;
    }

    getVerdict(marketId: string): CerberusVerdict | undefined {
        return this.verifiedMarkets.get(marketId);
    }

    getAllVerdicts(): CerberusVerdict[] {
        return Array.from(this.verifiedMarkets.values());
    }

    getTwitterMarketsStatus(): Array<{
        marketId: string;
        title: string;
        type: string;
        target: string;
        hoursLeft: number;
        lastChecked: string;
        nextCheckIn: string;
    }> {
        const now = Date.now();
        return Array.from(this.twitterMarkets.entries()).map(([id, data]) => {
            const lastCheck = this.twitterLastCheck.get(id) || 0;
            const interval = getPollingIntervalMs(data);
            const nextCheck = lastCheck + interval;

            return {
                marketId: id,
                title: data.title,
                type: data.twitterMarketType,
                target: `@${data.targetUsername || '?'} / "${data.targetKeyword || '?'}"`,
                hoursLeft: Math.max(0, (data.expiresAt - now) / (1000 * 60 * 60)),
                lastChecked: lastCheck ? new Date(lastCheck).toLocaleTimeString() : 'never',
                nextCheckIn: `${Math.max(0, (nextCheck - now) / 60000).toFixed(0)}min`,
            };
        });
    }

    async getAIResponse(message: string): Promise<string> {
        try {
            const { queryLLM } = await import('./llm-layer');
            const context = this.dashboardState.markets.slice(0, 5).map(m => ({
                title: m.title,
                status: m.verificationStatus
            }));

            const verdict = await queryLLM(message, "INTERACTION_PROTOCOL", context);
            return verdict.reasoning_summary;
        } catch (error: any) {
            console.error('[ORCHESTRATOR] Error getting AI response:', error.message || error);
            return "The Oracle's connection is experiencing interference.";
        }
    }

    async verifyMarket(marketId: string): Promise<CerberusVerdict | null> {
        const market = await this.djinnClient.getMarket(marketId);
        if (!market) {
            console.log(`[ORCHESTRATOR] Market not found: ${marketId}`);
            return null;
        }
        return this.processMarket(market);
    }

    private updateDashboard(market: DashboardMarket): void {
        const index = this.dashboardState.markets.findIndex(
            m => m.publicKey === market.publicKey
        );

        if (index >= 0) {
            this.dashboardState.markets[index] = market;
        } else {
            this.dashboardState.markets.unshift(market);
        }

        this.dashboardState.lastUpdated = Date.now();
        this.dashboardState.processingQueue = Array.from(this.processingQueue.keys());

        this.emit('dashboard_update', this.dashboardState);
    }

    private updateDashboardStats(): void {
        const markets = this.dashboardState.markets;
        this.dashboardState.stats = {
            totalMarkets: markets.length,
            verified: markets.filter(m => m.verificationStatus === 'verified').length,
            flagged: markets.filter(m => m.verificationStatus === 'flagged').length,
            rejected: markets.filter(m => m.verificationStatus === 'rejected').length,
            pending: markets.filter(m =>
                m.verificationStatus === 'pending_verification' ||
                m.verificationStatus.includes('processing')
            ).length
        };
    }
}

export function createOrchestrator(config?: Partial<CerberusConfig>): CerberusOrchestrator {
    return new CerberusOrchestrator(config);
}
