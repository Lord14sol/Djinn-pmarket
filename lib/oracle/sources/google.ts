import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// GOOGLE CUSTOM SEARCH SOURCE
// ============================================

interface GoogleConfig {
    enabled: boolean;
    api_key: string;
    cx: string;
    endpoint: string;
}

interface GoogleSearchItem {
    title: string;
    link: string;
    snippet: string;
    pagemap?: {
        metatags?: Array<{ 'article:published_time'?: string }>;
    };
}

interface GoogleSearchResponse {
    items?: GoogleSearchItem[];
    error?: {
        message: string;
    };
}

export class GoogleSource extends BaseSource {
    private apiKey: string;
    private cx: string;
    private endpoint: string;

    constructor(config: GoogleConfig) {
        super('google', 'Google Search', config);
        this.apiKey = config.api_key || '';
        this.cx = config.cx || '';
        this.endpoint = config.endpoint || 'https://www.googleapis.com/customsearch/v1';
    }

    isConfigured(): boolean {
        return this.config.enabled && this.apiKey.length > 0 && this.cx.length > 0;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'Google Search not configured' };
        }

        try {
            await this.log(`Searching Google for: ${query}`);

            const searchQuery = [query, ...keywords.slice(0, 3)].join(' ');
            const url = new URL(this.endpoint);
            url.searchParams.set('key', this.apiKey);
            url.searchParams.set('cx', this.cx);
            url.searchParams.set('q', searchQuery);
            url.searchParams.set('num', '10');
            url.searchParams.set('dateRestrict', 'd7'); // Last 7 days

            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error(`Google API error: ${response.status}`);
            }

            const data: GoogleSearchResponse = await response.json();

            if (data.error) {
                throw new Error(data.error.message);
            }

            const evidence: Evidence[] = (data.items || []).map(item => ({
                url: item.link,
                title: item.title,
                snippet: item.snippet,
                source: 'google',
                timestamp: item.pagemap?.metatags?.[0]?.['article:published_time'],
            }));

            await this.log(`Found ${evidence.length} Google results`, { count: evidence.length });

            return { success: true, evidence };
        } catch (error) {
            await this.logError('Google search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
