import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// TWITTER/X SOURCE CONNECTOR
// ============================================

interface TwitterConfig {
    enabled: boolean;
    bearer_token: string;
    search_endpoint: string;
}

interface Tweet {
    id: string;
    text: string;
    created_at: string;
    author_id: string;
    public_metrics?: {
        like_count: number;
        retweet_count: number;
        reply_count: number;
    };
}

interface TwitterSearchResponse {
    data?: Tweet[];
    meta?: {
        result_count: number;
    };
    errors?: Array<{ message: string }>;
}

export class TwitterSource extends BaseSource {
    private bearerToken: string;
    private endpoint: string;

    constructor(config: TwitterConfig) {
        super('twitter', 'Twitter/X', config);
        this.bearerToken = config.bearer_token || '';
        this.endpoint = config.search_endpoint || 'https://api.twitter.com/2/tweets/search/recent';
    }

    isConfigured(): boolean {
        return this.config.enabled && this.bearerToken.length > 0;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'Twitter not configured' };
        }

        try {
            await this.log(`Searching Twitter for: ${query}`);

            // Build search query with keywords
            const searchTerms = [query, ...keywords].join(' OR ');
            const url = new URL(this.endpoint);
            url.searchParams.set('query', searchTerms);
            url.searchParams.set('max_results', '20');
            url.searchParams.set('tweet.fields', 'created_at,public_metrics,author_id');

            const response = await fetch(url.toString(), {
                headers: {
                    'Authorization': `Bearer ${this.bearerToken}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Twitter API error: ${response.status} ${response.statusText}`);
            }

            const data: TwitterSearchResponse = await response.json();

            if (data.errors && data.errors.length > 0) {
                throw new Error(data.errors[0].message);
            }

            const evidence: Evidence[] = (data.data || []).map(tweet => ({
                url: `https://twitter.com/i/web/status/${tweet.id}`,
                title: `Tweet by @${tweet.author_id}`,
                snippet: tweet.text.substring(0, 280),
                source: 'twitter',
                timestamp: tweet.created_at,
            }));

            await this.log(`Found ${evidence.length} tweets`, { count: evidence.length });

            return { success: true, evidence };
        } catch (error) {
            await this.logError('Twitter search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
