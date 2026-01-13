import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// DEXSCREENER SOURCE
// ============================================

interface DexScreenerConfig {
    enabled: boolean;
    [key: string]: any;
}

interface DexPair {
    url: string;
    chainId: string;
    dexId: string;
    baseToken: { address: string; name: string; symbol: string };
    priceUsd: string;
    liquidity?: { usd: number };
    fdv?: number;
    marketCap?: number;
    priceChange?: { h24: number };
}

export class DexScreenerSource extends BaseSource {
    private baseUrl = 'https://api.dexscreener.com/latest/dex';

    constructor(config: DexScreenerConfig) {
        super('dexscreener', 'DexScreener', config);
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }

    /**
     * Extracts token profile and market data by contract address
     */
    async get_dex_data(contract: string): Promise<DexPair | null> {
        try {
            await this.log(`Fetching Dex data for contract: ${contract}`);
            const res = await fetch(`${this.baseUrl}/tokens/${contract}`);
            if (!res.ok) return null;

            const data = await res.json();
            const pairs: DexPair[] = data.pairs || [];

            // Sort by liquidity to get the most relevant pair
            const topPair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];
            return topPair || null;
        } catch (e) {
            console.error("DexScreener fetch error:", e);
            return null;
        }
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) return { success: false, evidence: [], error: 'DexScreener disabled' };

        try {
            await this.log(`Search DexScreener: ${query}`);
            const evidence: Evidence[] = [];

            // 1. Check for contract addresses in keywords (Solana or EVM)
            const contract = keywords.find(k => /^[A-HJ-NP-Za-km-z1-9]{32,44}$/.test(k) || /^0x[a-fA-F0-9]{40}$/.test(k));

            if (contract) {
                const pair = await this.get_dex_data(contract);
                if (pair) {
                    evidence.push({
                        url: pair.url,
                        title: `DexScreener: ${pair.baseToken.name} (${pair.baseToken.symbol})`,
                        snippet: `Price: $${pair.priceUsd} | Liquidity: $${pair.liquidity?.usd?.toLocaleString()} | MC: $${pair.marketCap || pair.fdv || 'N/A'} | 24h: ${pair.priceChange?.h24}%`,
                        source: 'dexscreener',
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                // 2. Fallback: Search by symbol if no contract found
                const potentialSymbol = keywords.find(k => /^[A-Z0-9]{3,6}$/i.test(k));
                if (potentialSymbol) {
                    const searchUrl = `${this.baseUrl}/search?q=${potentialSymbol}`;
                    const res = await fetch(searchUrl);
                    if (res.ok) {
                        const data = await res.json();
                        const pairs: DexPair[] = data.pairs || [];
                        const topPair = pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0))[0];

                        if (topPair) {
                            evidence.push({
                                url: topPair.url,
                                title: `DexScreener Search: ${topPair.baseToken.symbol}`,
                                snippet: `Price: $${topPair.priceUsd} | Liquidity: $${topPair.liquidity?.usd?.toLocaleString()} | 24h: ${topPair.priceChange?.h24}%`,
                                source: 'dexscreener',
                                timestamp: new Date().toISOString()
                            });
                        }
                    }
                }
            }

            return { success: true, evidence };
        } catch (error) {
            await this.logError('DexScreener failed', error);
            // Non-critical source, return empty success
            return { success: true, evidence: [], error: String(error) };
        }
    }
}
