import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// REDDIT JSON SOURCE - Social Sentiment
// ============================================

interface RedditJSONConfig {
    enabled: boolean;
}

const SUBREDDIT_MAP: Record<string, string[]> = {
    'bitcoin': ['bitcoin', 'CryptoCurrency'],
    'btc': ['bitcoin', 'CryptoCurrency'],
    'ethereum': ['ethereum', 'CryptoCurrency'],
    'eth': ['ethereum'],
    'solana': ['solana', 'CryptoCurrency'],
    'sol': ['solana'],
    'memecoin': ['memecoin', 'CryptoMoonShots'],
    'nft': ['NFT', 'CryptoCurrency'],
    'world cup': ['soccer', 'worldcup'],
    'argentina': ['argentina', 'soccer'],
    'trump': ['politics', 'news'],
    'elon': ['elonmusk', 'technology'],
};

export class RedditJSONSource extends BaseSource {
    constructor(config: RedditJSONConfig) {
        super('reddit_json', 'Reddit', config);
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'Reddit JSON not enabled' };
        }

        try {
            await this.log(`Searching Reddit for: ${query}`);

            // Find relevant subreddits
            const lowerQuery = query.toLowerCase();
            let subreddits: string[] = [];

            for (const [key, subs] of Object.entries(SUBREDDIT_MAP)) {
                if (lowerQuery.includes(key)) {
                    subreddits.push(...subs);
                }
            }

            // Fallback to general subs
            if (subreddits.length === 0) {
                subreddits = ['all'];
            }

            const evidence: Evidence[] = [];
            const uniqueSubs = [...new Set(subreddits)].slice(0, 2);

            for (const sub of uniqueSubs) {
                try {
                    const url = `https://www.reddit.com/r/${sub}/new.json?limit=5`;
                    const response = await fetch(url, {
                        headers: {
                            'User-Agent': 'Cerberus-Oracle/1.0'
                        }
                    });

                    if (response.ok) {
                        const data = await response.json();
                        const posts = data?.data?.children || [];

                        for (const post of posts) {
                            const p = post.data;
                            if (p.title && p.title.toLowerCase().includes(lowerQuery.split(' ')[0])) {
                                evidence.push({
                                    url: `https://reddit.com${p.permalink}`,
                                    title: p.title.substring(0, 100),
                                    snippet: `👤 u/${p.author} | ⬆️ ${p.score} pts | 💬 ${p.num_comments} comments | r/${sub}`,
                                    source: 'reddit',
                                    timestamp: new Date(p.created_utc * 1000).toISOString()
                                });
                            }
                        }
                    }
                } catch (e) {
                    // Skip individual subreddit errors
                }
            }

            await this.log(`Found ${evidence.length} Reddit posts`, { count: evidence.length });
            return { success: true, evidence };

        } catch (error) {
            await this.logError('Reddit JSON search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
