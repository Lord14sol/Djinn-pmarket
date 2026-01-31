import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// BINANCE SOURCE - Real-time Crypto Prices
// ============================================

interface BinanceConfig {
    enabled: boolean;
}

export class BinanceSource extends BaseSource {
    private endpoint = 'https://api.binance.com/api/v3';

    constructor(config: BinanceConfig) {
        super('binance', 'Binance', config);
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'Binance not enabled' };
        }

        try {
            await this.log(`Searching Binance for: ${query}`);

            // Detect trading pairs
            const symbolMap: Record<string, string> = {
                'bitcoin': 'BTCUSDT', 'btc': 'BTCUSDT',
                'ethereum': 'ETHUSDT', 'eth': 'ETHUSDT',
                'solana': 'SOLUSDT', 'sol': 'SOLUSDT',
                'dogecoin': 'DOGEUSDT', 'doge': 'DOGEUSDT',
                'bnb': 'BNBUSDT',
            };

            const detectedSymbols: string[] = [];
            const lowerQuery = query.toLowerCase();
            for (const [key, symbol] of Object.entries(symbolMap)) {
                if (lowerQuery.includes(key)) {
                    detectedSymbols.push(symbol);
                }
            }

            if (detectedSymbols.length === 0) {
                return { success: true, evidence: [] };
            }

            const evidence: Evidence[] = [];

            for (const symbol of [...new Set(detectedSymbols)]) {
                try {
                    const [priceRes, ticker24hRes] = await Promise.all([
                        fetch(`${this.endpoint}/ticker/price?symbol=${symbol}`),
                        fetch(`${this.endpoint}/ticker/24hr?symbol=${symbol}`)
                    ]);

                    if (priceRes.ok && ticker24hRes.ok) {
                        const priceData = await priceRes.json();
                        const ticker24h = await ticker24hRes.json();

                        evidence.push({
                            url: `https://www.binance.com/en/trade/${symbol.replace('USDT', '_USDT')}`,
                            title: `${symbol} - Binance Live Data`,
                            snippet: `💵 Price: $${parseFloat(priceData.price).toLocaleString()} | 📊 24h Volume: $${(parseFloat(ticker24h.quoteVolume) / 1e6).toFixed(2)}M | 📈 24h Change: ${parseFloat(ticker24h.priceChangePercent).toFixed(2)}%`,
                            source: 'binance',
                            timestamp: new Date().toISOString()
                        });
                    }
                } catch (e) {
                    // Skip individual symbol errors
                }
            }

            await this.log(`Found ${evidence.length} Binance results`, { count: evidence.length });
            return { success: true, evidence };

        } catch (error) {
            await this.logError('Binance search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
