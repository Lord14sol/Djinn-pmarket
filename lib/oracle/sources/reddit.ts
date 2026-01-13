import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// REDDIT SOURCE CONNECTOR
// ============================================

interface RedditConfig {
    enabled: boolean;
    client_id: string;
    client_secret: string;
    user_agent: string;
}

interface RedditPost {
    data: {
        id: string;
        title: string;
        selftext: string;
        url: string;
        permalink: string;
        subreddit: string;
        score: number;
        num_comments: number;
        created_utc: number;
    };
}

interface RedditSearchResponse {
    data?: {
        children: RedditPost[];
    };
    error?: string;
}

export class RedditSource extends BaseSource {
    private clientId: string;
    private clientSecret: string;
    private userAgent: string;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(config: RedditConfig) {
        super('reddit', 'Reddit', config);
        this.clientId = config.client_id || '';
        this.clientSecret = config.client_secret || '';
        this.userAgent = config.user_agent || 'DjinnOracle/1.0';
    }

    isConfigured(): boolean {
        return this.config.enabled && this.clientId.length > 0 && this.clientSecret.length > 0;
    }

    private async getAccessToken(): Promise<string> {
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        const auth = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

        const response = await fetch('https://www.reddit.com/api/v1/access_token', {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': this.userAgent,
            },
            body: 'grant_type=client_credentials',
        });

        if (!response.ok) {
            throw new Error(`Reddit auth failed: ${response.status}`);
        }

        const data = await response.json();
        this.accessToken = data.access_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

        return this.accessToken!;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'Reddit not configured' };
        }

        try {
            await this.log(`Searching Reddit for: ${query}`);

            const token = await this.getAccessToken();
            const searchQuery = encodeURIComponent([query, ...keywords].join(' '));

            const response = await fetch(
                `https://oauth.reddit.com/search?q=${searchQuery}&sort=relevance&limit=15&type=link`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'User-Agent': this.userAgent,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`Reddit API error: ${response.status}`);
            }

            const data: RedditSearchResponse = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const evidence: Evidence[] = (data.data?.children || []).map(post => ({
                url: `https://reddit.com${post.data.permalink}`,
                title: post.data.title,
                snippet: post.data.selftext.substring(0, 300) || `r/${post.data.subreddit} - ${post.data.score} upvotes`,
                source: 'reddit',
                timestamp: new Date(post.data.created_utc * 1000).toISOString(),
            }));

            await this.log(`Found ${evidence.length} Reddit posts`, { count: evidence.length });

            return { success: true, evidence };
        } catch (error) {
            await this.logError('Reddit search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
