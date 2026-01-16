import PQueue from 'p-queue';
import type { Market, ResolutionResult } from '../types/index.ts';
import { AGENT_CONFIG } from '../config/models.ts';

interface QueuedMarket {
    market: Market;
    priority: number; // 1-10 (10 = Highest)
    retries: number;
    addedAt: Date;
}

export class MarketQueue {
    private queue: PQueue;
    private pending: Map<string, QueuedMarket>;
    private inProgress: Set<string>;

    constructor(concurrency: number = AGENT_CONFIG.MAX_CONCURRENT_RESOLUTIONS) {
        this.queue = new PQueue({
            concurrency,
            interval: 1000,
            intervalCap: 5
        });
        this.pending = new Map();
        this.inProgress = new Set();
    }

    add(market: Market) {
        this.addBatch([market]);
    }

    addBatch(markets: Market[]) {
        for (const market of markets) {
            const key = market.address.toString();

            // Don't add if already pending or running
            if (this.pending.has(key) || this.inProgress.has(key)) continue;

            const priority = this.calculatePriority(market);

            this.pending.set(key, {
                market,
                priority,
                retries: 0,
                addedAt: new Date()
            });

            console.log(`📥 Queue: Added ${market.question} [Priority ${priority}]`);
        }
    }

    // Priority heuristic based on Liquidity
    private calculatePriority(market: Market): number {
        const lamports = market.totalLiquidity;
        const LAMPORTS_PER_SOL = 1000000000;
        const sol = lamports / LAMPORTS_PER_SOL;

        if (sol > 1000) return 10; // High Value
        if (sol > 100) return 8;
        if (sol > 10) return 5;
        return 3;
    }

    // Fetch highest priority item for processing
    // This manual selection enables the "Priority" logic on top of the generic PQueue
    async processNext(resolveFn: (market: Market) => Promise<ResolutionResult>) {
        const next = this.getHighestPriority();
        if (!next) return null;

        const marketKey = next.market.address.toString();
        this.inProgress.add(marketKey);
        this.pending.delete(marketKey); // Remove from pending, now it's "In Progress"

        // Schedule in PQueue to respect concurrency limits
        return this.queue.add(async () => {
            try {
                console.log(`⚡ Processing: ${next.market.question}`);
                const result = await resolveFn(next.market);

                this.inProgress.delete(marketKey);
                return result;

            } catch (error) {
                console.error(`⚠️ Failed ${next.market.question}:`, error);

                next.retries++;
                this.inProgress.delete(marketKey);

                if (next.retries < AGENT_CONFIG.RETRY_LIMIT) {
                    console.log(`🔄 Retrying... (${next.retries}/${AGENT_CONFIG.RETRY_LIMIT})`);
                    this.pending.set(marketKey, next); // Re-queue
                } else {
                    console.error(`❌ Dropped after retries: ${next.market.question}`);
                    // TODO: Log to Dead Letter Queue specifically
                }
                throw error;
            }
        });
    }

    private getHighestPriority(): QueuedMarket | null {
        let highest: QueuedMarket | null = null;

        for (const queued of this.pending.values()) {
            if (!highest || queued.priority > highest.priority) {
                highest = queued;
            } else if (queued.priority === highest.priority && queued.addedAt < highest.addedAt) {
                // FIFO for same priority
                highest = queued;
            }
        }

        return highest;
    }

    getStats() {
        return {
            pending: this.pending.size,
            inProgress: this.inProgress.size,
            completed: 0 // Track via external logger
        };
    }
}
