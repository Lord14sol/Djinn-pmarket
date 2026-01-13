import { TwitterSource } from './sources/twitter';
import { RedditSource } from './sources/reddit';
import { GoogleSource } from './sources/google';
import { YahooSource } from './sources/yahoo';
import { DexScreenerSource } from './sources/dexscreener';
import { AIAnalyzer } from './ai-analyzer';
import {
    getOracleConfig,
    getEnabledSources,
    logOracleEvent,
    createSuggestion,
    getPendingSuggestions,
    OracleConfig,
    OracleSource
} from './index';

export class OracleBot {
    private sources: any[] = [];
    private analyzer: AIAnalyzer;
    private config: OracleConfig | null = null;

    constructor() {
        this.analyzer = new AIAnalyzer({ apiKey: '', model: 'gemini-pro' });
    }

    async init() {
        this.config = await getOracleConfig();

        // Initialize sources with db config
        const dbSources = await getEnabledSources();

        // Map DB source configs to instances
        this.sources = [
            new TwitterSource(this.getSourceConfig(dbSources, 'twitter')),
            new RedditSource(this.getSourceConfig(dbSources, 'reddit')),
            new GoogleSource(this.getSourceConfig(dbSources, 'google')),
            new YahooSource({ enabled: true }),
            new DexScreenerSource({ enabled: true }), // New Source
        ];

        // Configure AI
        const geminiSource = dbSources.find(s => s.name === 'gemini');
        const openaiSource = dbSources.find(s => s.name === 'openai');

        let apiKey = '';
        let provider: 'gemini' | 'openai' = 'gemini';

        if (this.config.ai_provider === 'openai' && openaiSource) {
            apiKey = (openaiSource.config as any)?.api_key || '';
            provider = 'openai';
        } else if (geminiSource) {
            apiKey = (geminiSource.config as any)?.api_key || '';
            provider = 'gemini';
        }

        if (apiKey) {
            this.analyzer.updateConfig({ apiKey, provider, model: provider === 'gemini' ? 'gemini-pro' : 'gpt-4' });
            await logOracleEvent('system', `AI Analyzer configured with provider: ${provider}`);
        } else {
            await logOracleEvent('warning', 'AI Configuration missing API Key. Check oracle_sources table.');
        }
    }

    private getSourceConfig(dbSources: OracleSource[], name: string): any {
        const src = dbSources.find(s => s.name === name);
        return src ? { ...src.config, enabled: src.enabled } : { enabled: false };
    }

    async analyzeMarket(slug: string, question: string) {
        await logOracleEvent('system', `Starting analysis for: ${slug}`);

        if (!this.config) await this.init();

        const allEvidence = [];
        const keywords = this.extractKeywords(question);

        // 1. Fetch from all sources in parallel
        await logOracleEvent('fetch', `Querying sources: ${this.sources.filter(s => s.isConfigured()).map(s => s.name).join(', ')}`);

        const results = await Promise.all(
            this.sources.map(async source => {
                if (source.isConfigured()) {
                    try {
                        const res = await source.search(question, keywords);
                        if (res.success) {
                            return { source: source.name, evidence: res.evidence };
                        }
                    } catch (e) {
                        await logOracleEvent('error', `Source ${source.name} failed`, source.name);
                    }
                }
                return null;
            })
        );

        // 2. Aggregate Evidence
        for (const res of results) {
            if (res) allEvidence.push(...res.evidence);
        }

        if (allEvidence.length === 0) {
            await logOracleEvent('warning', 'No evidence found from any source.');
            return;
        }

        // 3. AI Analysis
        await logOracleEvent('analyze', `Analyzing ${allEvidence.length} pieces of evidence...`);
        const analysis = await this.analyzer.analyze(question, allEvidence);

        // 4. Create Suggestion
        await createSuggestion({
            market_slug: slug,
            market_title: question,
            suggested_outcome: analysis.suggestedOutcome,
            confidence: analysis.confidence,
            evidence: allEvidence,
            ai_analysis: analysis.reasoning,
            ai_provider: 'gemini', // Hardcoded for now
            sources_used: results.filter(r => r !== null).map(r => r!.source)
        });

        await logOracleEvent('suggest', `Created suggestion: ${analysis.suggestedOutcome} (${analysis.confidence}%)`);
    }

    private extractKeywords(text: string): string[] {
        // Simple mock extraction
        return text.split(' ').filter(w => w.length > 4);
    }
}
