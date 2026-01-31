import { BaseSource, SourceResult } from './base';
import { Evidence } from '../index';

// ============================================
// GDELT SOURCE - World's Largest News Database
// ============================================

interface GDELTConfig {
    enabled: boolean;
}

export class GDELTSource extends BaseSource {
    private endpoint = 'https://api.gdeltproject.org/api/v2/doc/doc';

    constructor(config: GDELTConfig) {
        super('gdelt', 'GDELT Project', config);
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }

    async search(query: string, keywords: string[]): Promise<SourceResult> {
        if (!this.isConfigured()) {
            return { success: false, evidence: [], error: 'GDELT not enabled' };
        }

        try {
            await this.log(`Searching GDELT for: ${query}`);

            // Build search query
            const searchTerms = encodeURIComponent([query, ...keywords.slice(0, 3)].join(' '));
            const url = `${this.endpoint}?query=${searchTerms}&mode=artlist&format=json&maxrecords=10&sort=datedesc`;

            const response = await fetch(url);
            if (!response.ok) throw new Error(`GDELT API error: ${response.status}`);

            const data = await response.json();
            const evidence: Evidence[] = [];

            const articles = data.articles || [];
            for (const article of articles.slice(0, 8)) {
                evidence.push({
                    url: article.url || '',
                    title: article.title || 'Untitled',
                    snippet: `📰 ${article.sourcecountry || 'Unknown'} | ${article.seendate?.substring(0, 10) || 'Recent'} | Tone: ${article.tone?.toFixed(1) || 'N/A'}`,
                    source: 'gdelt',
                    timestamp: article.seendate ? new Date(article.seendate).toISOString() : new Date().toISOString()
                });
            }

            await this.log(`Found ${evidence.length} GDELT results`, { count: evidence.length });
            return { success: true, evidence };

        } catch (error) {
            await this.logError('GDELT search failed', error);
            return { success: false, evidence: [], error: String(error) };
        }
    }
}
