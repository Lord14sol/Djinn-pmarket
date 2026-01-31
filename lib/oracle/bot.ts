import { TwitterSource } from './sources/twitter';
import { RedditSource } from './sources/reddit';
import { GoogleSource } from './sources/google';
import { YahooSource } from './sources/yahoo';
import { DexScreenerSource } from './sources/dexscreener';
import { CoinGeckoSource } from './sources/coingecko';
import { BinanceSource } from './sources/binance';
import { ESPNSource } from './sources/espn';
import { GDELTSource } from './sources/gdelt';
import { RedditJSONSource } from './sources/reddit-json';
import { USGSSource } from './sources/usgs';
import { AIAnalyzer } from './ai-analyzer';
import {
    getOracleConfig,
    getEnabledSources,
    logOracleEvent,
    createSuggestion,
    updateMarketDogLogs,
    OracleConfig,
    OracleSource
} from './index';

// Source Icons for UI
const SOURCE_ICONS: Record<string, string> = {
    dexscreener: '🦎',
    coingecko: '🦎',
    binance: '🟡',
    yahoo: '📈',
    espn: '🏈',
    gdelt: '🌍',
    reddit: '👽',
    reddit_json: '👽',
    usgs: '🌋',
    google: '🔍',
    twitter: '🐦',
};

export class OracleBot {
    private sources: any[] = [];
    private analyzer: AIAnalyzer;
    private config: OracleConfig | null = null;

    // API Keys (Loaded from env)
    private geminiKey: string = process.env.GEMINI_API_KEY || "";
    private openaiKey: string = process.env.OPENAI_API_KEY || "";

    constructor() {
        // Use Gemini 2.0 Flash Lite (lightweight model, alternative to 1.5-flash-8b which was not found)
        this.analyzer = new AIAnalyzer({
            apiKey: this.geminiKey,
            provider: 'gemini',
            model: 'gemini-2.0-flash-lite'
        });
    }








    async init() {
        this.config = await getOracleConfig();
        const dbSources = await getEnabledSources();

        // Initialize ALL sources (public ones are always enabled)
        this.sources = [
            // Crypto Sources (All Public)
            new DexScreenerSource({ enabled: true }),
            new CoinGeckoSource({ enabled: true }),
            new BinanceSource({ enabled: true }),
            new YahooSource({ enabled: true }),

            // News & Sports (All Public)
            new ESPNSource({ enabled: true }),
            new GDELTSource({ enabled: true }),
            new USGSSource({ enabled: true }),
            new RedditJSONSource({ enabled: true }),

            // Requires API Keys (check DB config)
            new TwitterSource(this.getSourceConfig(dbSources, 'twitter')),
            new RedditSource(this.getSourceConfig(dbSources, 'reddit')),
            new GoogleSource(this.getSourceConfig(dbSources, 'google')),
        ];

        // Keep using OpenAI (configured in constructor)
        // Removed Gemini override that was causing 404 errors

        await logOracleEvent('system', `Cerberus AI initialized with ${this.sources.length} sources (OpenAI GPT-4o-mini)`);
    }


    private getSourceConfig(dbSources: OracleSource[], name: string): any {
        const src = dbSources.find(s => s.name === name);
        return src ? { ...src.config, enabled: src.enabled } : { enabled: false };
    }

    async analyzeMarket(slug: string, question: string) {
        let marketId = '';
        try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3002';
            const res = await fetch(`${baseUrl}/api/markets`);
            const markets = await res.json();
            const m = markets.find((m: any) => m.id === slug || m.slug === slug || m.title === question);
            marketId = m?.id;
        } catch (e) { }

        const dog1Logs: string[] = [];
        const dog2Logs: string[] = [];
        const dog3Logs: string[] = [];

        const logDog = async (dog: 1 | 2 | 3, msg: string) => {
            console.log(`[DOG_${dog}] ${msg}`);
            if (dog === 1) dog1Logs.push(msg);
            else if (dog === 2) dog2Logs.push(msg);
            else if (dog === 3) dog3Logs.push(msg);

            if (marketId) {
                const logs = dog === 1 ? dog1Logs : dog === 2 ? dog2Logs : dog3Logs;
                await updateMarketDogLogs(marketId, dog, { logs });
            }
        };

        await logOracleEvent('system', `Starting analysis for: ${slug}`);
        if (!this.config) await this.init();

        // 🐕 DOG 1: HUNTER - DATA GATHERING
        await logDog(1, `🐕 DOG 1 (HUNTER) activado`);
        await logDog(1, `> Objetivo: "${question}"`);

        const allEvidence = [];
        const keywords = this.extractKeywords(question);
        const usedSources: string[] = [];

        // List active sources with icons
        const activeSources = this.sources.filter(s => s.isConfigured?.() !== false);
        const sourceNames = activeSources.map(s => `${SOURCE_ICONS[s.name] || '📡'} ${s.name.toUpperCase()}`);
        await logDog(1, `> Fuentes activas: ${sourceNames.join(', ')}`);

        const results = await Promise.all(
            this.sources.map(async source => {
                if (source.isConfigured?.() !== false) {
                    try {
                        const icon = SOURCE_ICONS[source.name] || '📡';
                        await logDog(1, `> ${icon} [${source.name.toUpperCase()}] Escaneando...`);
                        const res = await source.search(question, keywords);
                        if (res.success && res.evidence.length > 0) {
                            await logDog(1, `> ${icon} [OK] ${source.name.toUpperCase()} → ${res.evidence.length} resultados`);
                            usedSources.push(source.name);
                            return { source: source.name, evidence: res.evidence };
                        } else {
                            await logDog(1, `> ${icon} [—] ${source.name.toUpperCase()} sin datos`);
                        }
                    } catch (e) {
                        await logDog(1, `> ❌ [ERR] ${source.name.toUpperCase()}`);
                    }
                }
                return null;
            })
        );

        for (const res of results) {
            if (res) allEvidence.push(...res.evidence);
        }

        // Finalize Dog 1
        if (marketId) {
            await updateMarketDogLogs(marketId, 1, {
                logs: dog1Logs,
                score: Math.min(100, allEvidence.length * 10),
                report: `Recolectó ${allEvidence.length} evidencias de ${usedSources.length} fuentes.`
            });
        }

        if (allEvidence.length === 0) {
            await logDog(1, `> ⚠️ No se encontró evidencia externa.`);
            await logDog(3, `🐕 DOG 3 (JUDGE): UNCERTAIN - Sin datos suficientes.`);
            if (marketId) {
                await updateMarketDogLogs(marketId, 3, {
                    logs: dog3Logs,
                    verdict: 'UNCERTAIN',
                    requiresHuman: true,
                    score: 0,
                    report: 'No evidence found from any source.'
                });
            }
            return;
        }

        // ⏱️ DELAY: Wait 5 seconds before Dog 2 to avoid rate limiting
        await logDog(1, `> ⏳ Esperando 5s antes de pasar a DOG 2...`);
        await new Promise(r => setTimeout(r, 5000));

        // 🐕 DOG 2: ANALYST - REASONING
        const dog1Report = `Fuentes: ${usedSources.join(', ')}. Evidencias: ${allEvidence.length}.`;
        await logDog(2, `🐕 DOG 2 (ANALYST) activado`);
        await logDog(2, `> Leyendo reporte de DOG 1: ${dog1Report}`);
        await logDog(2, `> Procesando ${allEvidence.length} evidencias...`);
        await logDog(2, `> Motor: Gemini 2.0 Flash Lite`);

        let analysis: any = null;
        try {
            analysis = await this.analyzer.analyze(question, allEvidence);

            const reasoningLines = analysis.reasoning.split('. ').filter((l: string) => l.length > 5).slice(0, 5);
            for (const line of reasoningLines) {
                await logDog(2, `> 💭 ${line.trim()}`);
                await new Promise(r => setTimeout(r, 200));
            }

            // Finalize Dog 2
            const dog2Report = analysis.reasoning.substring(0, 500);
            if (marketId) {
                await updateMarketDogLogs(marketId, 2, {
                    logs: dog2Logs,
                    score: analysis.confidence,
                    report: dog2Report
                });
            }

            // ⏱️ DELAY: Wait 5 seconds before Dog 3
            await logDog(2, `> ⏳ Esperando 5s antes de pasar a DOG 3...`);
            await new Promise(r => setTimeout(r, 5000));

        } catch (aiError) {
            await logDog(2, `> ❌ ERROR: Gemini API falló - ${String(aiError).substring(0, 100)}`);
            if (marketId) {
                await updateMarketDogLogs(marketId, 2, { logs: dog2Logs, score: 0, report: 'AI analysis failed.' });
            }

            // Fallback to Dog 3 UNCERTAIN  
            await logDog(3, `🐕 DOG 3 (JUDGE) activado`);
            await logDog(3, `> Leyendo reporte de DOG 1: ${dog1Report}`);
            await logDog(3, `> ⚠️ AI análisis falló. Requiere revisión humana.`);
            if (marketId) {
                await updateMarketDogLogs(marketId, 3, {
                    logs: dog3Logs,
                    verdict: 'UNCERTAIN',
                    requiresHuman: true,
                    score: 0,
                    report: `DOG 1: ${dog1Report}. DOG 2: AI failed. Requiere revisión LORD.`
                });
            }
            return;
        }

        // 🐕 DOG 3: JUDGE - VERDICT
        await logDog(3, `🐕 DOG 3 (JUDGE) activado`);
        await logDog(3, `> Confianza: ${analysis.confidence}%`);
        await logDog(3, `> Veredicto: ${analysis.suggestedOutcome}`);

        const requiresHuman = analysis.confidence < 85;
        if (!requiresHuman) {
            await logDog(3, `> ✅ Alta confianza → Auto-verificable`);
        } else {
            await logDog(3, `> ⚠️ Requiere revisión humana (LORD)`);
        }

        // Finalize Dog 3
        if (marketId) {
            await updateMarketDogLogs(marketId, 3, {
                logs: dog3Logs,
                verdict: analysis.suggestedOutcome,
                requiresHuman: requiresHuman,
                score: analysis.confidence,
                report: `Cerberus AI sugiere: ${analysis.suggestedOutcome} (${analysis.confidence}%)`
            });
        }

        // Create Suggestion in Supabase
        await createSuggestion({
            market_slug: slug,
            market_title: question,
            suggested_outcome: analysis.suggestedOutcome,
            confidence: analysis.confidence,
            evidence: allEvidence,
            ai_analysis: analysis.reasoning,
            ai_provider: 'gemini',
            sources_used: usedSources
        });

        // Auto-update status if high confidence
        if (marketId && !requiresHuman) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://127.0.0.1:3002';
            await fetch(`${baseUrl}/api/markets`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: marketId,
                    status: analysis.suggestedOutcome === 'YES' ? 'VERIFIED' : analysis.suggestedOutcome === 'NO' ? 'REJECTED' : 'UNCERTAIN'
                })
            });
        }

        await logOracleEvent('suggest', `Cerberus: ${analysis.suggestedOutcome} (${analysis.confidence}%)`);
    }

    private extractKeywords(text: string): string[] {
        return text.split(' ').filter(w => w.length > 4).map(w => w.replace(/[?!.,]/g, ''));
    }
}
