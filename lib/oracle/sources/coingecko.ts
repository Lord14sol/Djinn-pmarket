import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// COINGECKO SOURCE - Established Crypto Prices
// ============================================

interface CoinGeckoConfig {
    enabled: boolean;
}

export class CoinGeckoSource extends BaseSource {
    private endpoint = 'https://api.coingecko.com/api/v3';

    constructor(config: CoinGeckoConfig) {
        super('coingecko', 'CoinGecko', config);
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'CoinGecko not enabled' };
        }

        try {
            await this.log(`Searching CoinGecko for: ${query}`);

            // Detect crypto keywords
            const cryptoMap: Record<string, string> = {
                'bitcoin': 'bitcoin', 'btc': 'bitcoin',
                'ethereum': 'ethereum', 'eth': 'ethereum',
                'solana': 'solana', 'sol': 'solana',
                'dogecoin': 'dogecoin', 'doge': 'dogecoin',
            };

            const detectedCoins: string[] = [];
            const lowerQuery = query.toLowerCase();
            for (const [key, id] of Object.entries(cryptoMap)) {
                if (lowerQuery.includes(key)) {
                    detectedCoins.push(id);
                }
            }

            if (detectedCoins.length === 0) {
                return { success: true, evidence: [] };
            }

            const ids = [...new Set(detectedCoins)].join(',');
            const url = `${this.endpoint}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`CoinGecko API error: ${response.status}`);

            const data = await response.json();
            const evidence: Evidence[] = [];

            for (const [coinId, info] of Object.entries(data) as [string, any][]) {
                evidence.push({
                    url: `https://www.coingecko.com/en/coins/${coinId}`,
                    title: `${coinId.toUpperCase()} Market Data`,
                    snippet: `💰 Price: $${info.usd?.toLocaleString() || 'N/A'} | 📈 24h Change: ${info.usd_24h_change?.toFixed(2) || 'N/A'}% | 🏦 MCap: $${(info.usd_market_cap / 1e9)?.toFixed(2) || 'N/A'}B`,
                    source: 'coingecko',
                    timestamp: new Date().toISOString()
                });
            }

            await this.log(`Found ${evidence.length} CoinGecko results`, { count: evidence.length });
            return { success: true, evidence };

        } catch (error) {
            await this.logError('CoinGecko search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
