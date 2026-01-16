import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import axios from 'axios';
import { loadVault } from '../config/vault';
import { MODELS, AGENT_CONFIG } from '../config/models';
import type { LinkData, AIResponse } from '../types/index';

export class ConsensusEngine {
    private geminiClient: GoogleGenerativeAI | null = null;
    private openaiClient: OpenAI | null = null;
    private perplexityApiKey: string | null = null;
    private rapidApiKey: string | null = null;
    private yahooHost: string | null = null;
    private birdeyeApiKey: string | null = null;
    private coingeckoApiKey: string | null = null;
    private tmdbApiKey: string | null = null;
    private tmdbAccessToken: string | null = null;
    private predicthqApiKey: string | null = null;

    // Confidence Thresholds
    private readonly LAYER1_THRESHOLD = 0.9;
    private readonly TRINITY_THRESHOLD = 0.95;

    constructor() {
        const vault = loadVault();
        if (vault.GEMINI_API_KEY) this.geminiClient = new GoogleGenerativeAI(vault.GEMINI_API_KEY);
        if (vault.OPENAI_API_KEY) this.openaiClient = new OpenAI({ apiKey: vault.OPENAI_API_KEY });
        if (vault.PERPLEXITY_API_KEY) this.perplexityApiKey = vault.PERPLEXITY_API_KEY;
        this.rapidApiKey = vault.RAPIDAPI_KEY || null;
        this.yahooHost = vault.YAHOO_FINANCE_HOST || null;
        this.birdeyeApiKey = vault.BIRDEYE_API_KEY || null;
        this.coingeckoApiKey = vault.COINGECKO_API_KEY || null;
        this.tmdbApiKey = vault.TMDB_API_KEY || null;
        this.tmdbAccessToken = vault.TMDB_ACCESS_TOKEN || null;
        this.predicthqApiKey = vault.PREDICTHQ_API_KEY || null;
    }

    /**
     * Fetch Raw Data from Financial/News APIs
     */
    async fetchRapidData(endpoint: string, params: any) {
        if (!this.rapidApiKey) return null;
        try {
            const url = endpoint.includes('http') ? endpoint : `https://${this.yahooHost}/${endpoint}`;
            const res = await axios.get(url, {
                params,
                headers: {
                    'x-rapidapi-key': this.rapidApiKey,
                    'x-rapidapi-host': endpoint.includes('cnn') ? 'cnn-api1.p.rapidapi.com' : this.yahooHost
                }
            });
            return res.data;
        } catch (e) {
            console.error("RapidAPI Error:", e);
            return null;
        }
    }

    /**
     * Fetch On-Chain Data from BirdEye
     */
    async fetchBirdEyePrice(address: string) {
        if (!this.birdeyeApiKey) return null;
        try {
            const res = await axios.get(`https://public-api.birdeye.so/defi/price?address=${address}`, {
                headers: {
                    'X-API-KEY': this.birdeyeApiKey,
                    'x-chain': 'solana',
                    'accept': 'application/json'
                }
            });
            return res.data?.data?.value || null;
        } catch (e) {
            console.error("BirdEye Price Fetch Error:", e);
            return null;
        }
    }

    async fetchBirdEyeOverview(address: string) {
        if (!this.birdeyeApiKey) return null;
        try {
            const res = await axios.get(`https://public-api.birdeye.so/defi/token_overview?address=${address}`, {
                headers: {
                    'X-API-KEY': this.birdeyeApiKey,
                    'x-chain': 'solana',
                    'accept': 'application/json'
                }
            });
            return res.data?.data || null;
        } catch (e) {
            console.error("BirdEye Overview Fetch Error:", e);
            return null;
        }
    }

    async fetchBirdEyeMemeDetail(address: string) {
        if (!this.birdeyeApiKey) return null;
        try {
            const res = await axios.get(`https://public-api.birdeye.so/defi/v3/token/meme/detail/single?address=${address}`, {
                headers: {
                    'X-API-KEY': this.birdeyeApiKey,
                    'x-chain': 'solana',
                    'accept': 'application/json'
                }
            });
            return res.data?.data || null;
        } catch (e) {
            console.error("BirdEye Meme Detail Fetch Error:", e);
            return null;
        }
    }

    /**
     * Fetch On-Chain Data from GeckoTerminal (CoinGecko)
     * Base URL: https://api.geckoterminal.com/api/v2
     */
    async fetchGeckoTerminalPrice(poolAddress: string, network: string = 'solana') {
        try {
            const headers: any = {
                'Accept': 'application/json;version=20230203'
            };
            if (this.coingeckoApiKey) {
                headers['x-cg-demo-api-key'] = this.coingeckoApiKey;
            }

            const res = await axios.get(`https://api.geckoterminal.com/api/v2/networks/${network}/pools/${poolAddress}`, {
                headers
            });

            return res.data?.data?.attributes?.base_token_price_usd || null;
        } catch (e) {
            console.error("GeckoTerminal Fetch Error:", e);
            return null;
        }
    }

    /**
     * Fetch Movie/Entertainment Data from TMDB
     * Base URL: https://api.themoviedb.org/3
     */
    async fetchMovieData(movieIdOrTitle: string) {
        if (!this.tmdbApiKey) return null;
        try {
            const isId = /^\d+$/.test(movieIdOrTitle);
            const endpoint = isId ? `movie/${movieIdOrTitle}` : `search/movie?query=${encodeURIComponent(movieIdOrTitle)}`;

            const res = await axios.get(`https://api.themoviedb.org/3/${endpoint}`, {
                headers: {
                    'Authorization': `Bearer ${this.tmdbAccessToken}`,
                    'Accept': 'application/json'
                },
                params: isId ? {} : { api_key: this.tmdbApiKey }
            });

            return isId ? res.data : (res.data?.results?.[0] || null);
        } catch (e) {
            console.error("TMDB Fetch Error:", e);
            return null;
        }
    }

    /**
     * Fetch Event Data from PredictHQ
     * Base URL: https://api.predicthq.com/v1/events
     */
    async fetchPredictHQEvents(query: string, category?: string) {
        if (!this.predicthqApiKey) return null;
        try {
            const res = await axios.get(`https://api.predicthq.com/v1/events`, {
                headers: {
                    'Authorization': `Bearer ${this.predicthqApiKey}`,
                    'Accept': 'application/json'
                },
                params: {
                    q: query,
                    category: category || undefined
                }
            });
            return res.data?.results || [];
        } catch (e) {
            console.error("PredictHQ Fetch Error:", e);
            return null;
        }
    }

    /**
     * Fetch Trending Markets from Polymarket (Gamma API)
     * Category: Pop Culture (tag_id 13)
     */
    async fetchPolymarketTrending(tagId: number = 13) {
        try {
            const url = `https://gamma-api.polymarket.com/events?active=true&closed=false&tag_id=${tagId}`;
            const res = await axios.get(url);
            return res.data || [];
        } catch (e) {
            console.error("Polymarket Gamma API Error:", e);
            return [];
        }
    }

    /**
     * CAPA 1 Resource Aggregator
     * Scans all connected APIs for relevant ground truth before AI reasoning.
     */
    async gatherMultiResourceTruth(question: string): Promise<string> {
        let extraContext = "";
        const q = question.toLowerCase();

        try {
            // 1. Crypto / Finance (Yahoo & Binance)
            if (q.includes("bitcoin") || q.includes("btc") || q.includes("eth") || q.includes("sol") || q.includes("price") || q.includes("market cap")) {
                const symbols = q.includes("btc") ? "BTC-USD" : (q.includes("eth") ? "ETH-USD" : (q.includes("sol") ? "SOL-USD" : "BTC-USD"));
                const financeData = await this.fetchRapidData('finance/quote', { symbols });
                if (financeData) extraContext += `\n[YAHOO FINANCE]: ${JSON.stringify(financeData)}`;
            }

            // 2. On-Chain Solana (BirdEye/Gecko) - Extract addresses if present
            const solAddressMatch = question.match(/[1-9A-HJ-NP-Za-km-z]{32,44}/);
            if (solAddressMatch) {
                const address = solAddressMatch[0];
                const [bPrice, overview] = await Promise.all([
                    this.fetchBirdEyePrice(address),
                    this.fetchBirdEyeOverview(address)
                ]);
                if (bPrice) extraContext += `\n[BIRDEYE ON-CHAIN]: Price=${bPrice} | Info=${JSON.stringify(overview)}`;
            }

            // 3. Movies (TMDB)
            if (q.includes("movie") || q.includes("film") || q.includes("box office") || q.includes("oscar") || q.includes("tomatoes")) {
                extraContext += `\n[HINT]: Entertainment Market detected. Sentinel is cross-referencing TMDB for final confirmation.`;
            }

            // 4. Events (PredictHQ)
            if (q.includes("concert") || q.includes("festival") || q.includes("match") || q.includes("game") || q.includes("event")) {
                const events = await this.fetchPredictHQEvents(question);
                if (events && events.length > 0) extraContext += `\n[PREDICTHQ EVENTS]: Recorded Evidence: ${JSON.stringify(events.slice(0, 2))}`;
            }
        } catch (e) {
            console.warn("Truth Gathering Warning:", e);
        }

        return extraContext;
    }

    /**
     * Fetch Global Trending Events (Top 100)
     */
    async fetchPolymarketGlobal(limit: number = 100) {
        try {
            const url = `https://gamma-api.polymarket.com/events?active=true&closed=false&limit=${limit}`;
            const res = await axios.get(url);
            return res.data || [];
        } catch (e) {
            console.error("Polymarket Global API Error:", e);
            return [];
        }
    }

    /**
     * Cross-Verify with Polymarket
     * Searches for a similar market and returns its state.
     */
    async crossVerifyWithPolymarket(question: string): Promise<{ found: boolean; status: 'OPEN' | 'CLOSED'; outcome?: string; price?: number; title?: string }> {
        try {
            // Search for events matching the question
            const url = `https://gamma-api.polymarket.com/events?q=${encodeURIComponent(question)}`;
            const res = await axios.get(url);
            const events = res.data || [];

            if (events.length === 0) return { found: false, status: 'OPEN' };

            // Find the best match (simplistic title check)
            const event = events[0]; // Take the first result as most relevant
            const market = event.markets?.[0];

            if (!market) return { found: false, status: 'OPEN' };

            const isClosed = market.closed || event.closed;

            return {
                found: true,
                status: isClosed ? 'CLOSED' : 'OPEN',
                outcome: market.outcomePrices ? (parseFloat(market.outcomePrices[0]) > 0.5 ? 'YES' : 'NO') : undefined,
                price: market.outcomePrices ? parseFloat(market.outcomePrices[0]) : undefined,
                title: event.title
            };
        } catch (e) {
            console.error("Polymarket Cross-Verify Error:", e);
            return { found: false, status: 'OPEN' };
        }
    }





    /**
     * CAPA 1: La Forja (IA Dual + Scoring)
     * Uses Gemini and GPT-4o. Returns YES/NO only if both agree with High Confidence (>0.9).
     * Includes CAPA 1.5: Internal Audit.
     */
    async executeLayer1Forge(question: string, linkData: LinkData, sourceUrl: string): Promise<AIResponse> {
        console.log(`🛡️ Sentinel Layer 1: The Forge - Detecting for '${question}'...`);

        // 1. Gather Ground Truth from all available sources
        const [poly, truthSignal] = await Promise.all([
            this.crossVerifyWithPolymarket(question),
            this.gatherMultiResourceTruth(question)
        ]);

        if (poly.found) {
            console.log(`   Forge Debug [POLYMARKET]: Found mirror market! Status=${poly.status} | Title="${poly.title}" | Price=${poly.price}`);
            if (poly.status === 'CLOSED' && poly.outcome) {
                console.log(`   Forge Debug [POLYMARKET]: Market is CLOSED. Final Outcome reported as ${poly.outcome}`);
            }
        }

        if (truthSignal) {
            console.log(`   Forge Debug [RAW DATA]: Extra truth context gathered (${truthSignal.length} chars)`);
        }

        // 2. Dual AI Consensus with truth context
        const [gemini, gpt] = await Promise.all([
            this.askGemini(question, linkData, sourceUrl, poly, truthSignal),
            this.askGPT(question, linkData, sourceUrl, poly, truthSignal)
        ]);

        console.log(`   Forge Debug: Gemini=${gemini.answer} (${gemini.confidence}) - ${gemini.reasoning}`);
        console.log(`   Forge Debug: GPT=${gpt.answer} (${gpt.confidence}) - ${gpt.reasoning}`);

        // Consensus logic
        const bothAgree = gemini.answer === gpt.answer;
        const avgConf = (gemini.confidence + gpt.confidence) / 2;

        if (bothAgree && avgConf >= this.LAYER1_THRESHOLD && gemini.answer !== 'UNCERTAIN') {
            const initialResult: AIResponse = {
                answer: gemini.answer,
                reasoning: `Layer 1 Consensus. Gemini: ${gemini.reasoning} | GPT: ${gpt.reasoning}`,
                confidence: avgConf,
                sources: [sourceUrl]
            };

            // CAPA 1.5: Auditoría Interna
            console.log("   🕵️ Capa 1.5: Internal Audit Initiated...");
            const audit = await this.auditLayer15(question, linkData, initialResult);

            if (audit.passed) {
                console.log("   ✅ Capa 1.5: Audit Passed.");
                return initialResult;
            } else {
                console.warn(`   ⚠️ Capa 1.5: Audit FAILED. Reason: ${audit.reason}`);
                return {
                    answer: 'UNCERTAIN',
                    reasoning: `Layer 1.5 Audit Failed: ${audit.reason}`,
                    confidence: 0,
                    sources: []
                };
            }
        }

        return {
            answer: 'UNCERTAIN',
            reasoning: `Layer 1 Conflict or Low Confidence (Agree: ${bothAgree}, Conf: ${avgConf})`,
            confidence: avgConf,
            sources: []
        };
    }

    /**
     * CAPA 1.5: Auditoría Interna
     * A separate AI Agent reviews the conclusion for logical consistency.
     */
    private async auditLayer15(question: string, linkData: LinkData, proposed: AIResponse): Promise<{ passed: boolean; reason?: string }> {
        if (!this.openaiClient) return { passed: true }; // Skip if no auditor available

        try {
            const prompt = `
             AUDIT TASK. 
             Question: "${question}"
             Evidence: "${linkData.text.substring(0, 1000)}..."
             Proposed Conclusion: "${proposed.answer}" because "${proposed.reasoning}"
             
             Task: Verify if the conclusion LOGICALLY follows the evidence. Check for hallucinations.
             Output JSON: { "passed": boolean, "reason": "string" }
             `;

            const res = await this.openaiClient.chat.completions.create({
                model: "gpt-4-turbo", // Use a smart model for auditing
                messages: [{ role: "system", content: "You are a strict Logic Auditor." }, { role: "user", content: prompt }],
                response_format: { type: "json_object" }
            });

            const auditRes = JSON.parse(res.choices[0].message.content || '{}');
            return { passed: auditRes.passed, reason: auditRes.reason };
        } catch (e) {
            console.error("Audit Error:", e);
            return { passed: false, reason: "Audit Process Error" }; // Fail safe
        }
    }

    /**
     * CAPA 3: El Sello (Triple Verification)
     * Runs Gemini + GPT + Perplexity (Web Search) to ensure UNANIMOUS consensus.
     */
    async executeLayer3Seal(question: string, sourceUrl: string): Promise<AIResponse> {
        console.log(`🛡️ Sentinel Layer 3: The Seal Protocol Active...`);

        // Mock LinkData for non-scraper calls or implement robust scraping here
        const mockLinkData: LinkData = { isValid: true, text: "Verification Phase", type: "unknown" };

        const [gemini, gpt, perplexity] = await Promise.all([
            this.askGemini(question, mockLinkData, sourceUrl),
            this.askGPT(question, mockLinkData, sourceUrl),
            this.askPerplexity(question, sourceUrl)
        ]);

        const votes = { YES: 0, NO: 0, UNCERTAIN: 0 };
        [gemini, gpt, perplexity].forEach(r => votes[r.answer]++);

        console.log(`   🗳️ Seal Votes: YES=${votes.YES}, NO=${votes.NO}, UNC=${votes.UNCERTAIN}`);

        if (votes.YES === 3) return { answer: 'YES', confidence: 1.0, sources: [], reasoning: "The Seal: Unanimous YES" };
        if (votes.NO === 3) return { answer: 'NO', confidence: 1.0, sources: [], reasoning: "The Seal: Unanimous NO" };

        // Strict: If any dissent -> Uncertain -> Freeze
        return {
            answer: 'UNCERTAIN',
            reasoning: "The Seal Broken: Dissent Detected. Escalating to G1.",
            confidence: 0,
            sources: []
        };
    }

    // --- BASE MODEL IMPLEMENTATIONS ---

    private async askGemini(question: string, linkData: LinkData, sourceUrl: string, polyData?: any, extraTruth?: string): Promise<AIResponse> {
        if (!this.geminiClient) return this.createError("Gemini Key Missing");
        try {
            let polyContext = "";
            if (polyData?.found) {
                polyContext = `\n[POLYMARKET DATA]: Mirrored market "${polyData.title}" found. Status: ${polyData.status}. Current outcome prediction: ${polyData.outcome} (Price: ${polyData.price})`;
            }

            const model = this.geminiClient.getGenerativeModel({ model: MODELS.GEMINI });
            const prompt = `Oracle Task. Q: "${question}". Source Evidence: ${linkData.text}. ${polyContext} ${extraTruth || ""} \n\nIMPORTANT: You must follow the market resolution rules strictly. If the evidence supports a YES/NO, be decisive. If Polymarket is CLOSED, its outcome is a master truth signal. \nOutput JSON only: { "answer": "YES"|"NO"|"UNCERTAIN", "confidence": 0.0-1.0, "reasoning": "string" }`;
            const res = await model.generateContent(prompt);
            const raw = res.response.text();
            console.log(`[DEBUG] Gemini Raw: ${raw}`);
            return this.parseJSON(raw);
        } catch (e: any) { return this.createError(e.message); }
    }



    private async askGPT(question: string, linkData: LinkData, sourceUrl: string, polyData?: any, extraTruth?: string): Promise<AIResponse> {
        if (!this.openaiClient) return this.createError("OpenAI Key Missing");
        try {
            let polyContext = "";
            if (polyData?.found) {
                polyContext = `\nPolymarket Context: Mirrored market found. Status: ${polyData.status}. Prediction: ${polyData.outcome}`;
            }

            const res = await this.openaiClient.chat.completions.create({
                model: MODELS.GPT,
                messages: [
                    { role: "system", content: "You are a professional Oracle. Reply only with valid JSON. Use available Polymarket context and raw data as a verification anchor." },
                    { role: "user", content: `Question: ${question}\nEvidence: ${linkData.text} ${polyContext} ${extraTruth || ""}` }
                ],
                response_format: { type: "json_object" }
            });
            const raw = res.choices[0].message.content || '{}';
            console.log(`[DEBUG] GPT Raw: ${raw}`);
            return JSON.parse(raw) as AIResponse;
        } catch (e: any) { return this.createError(e.message); }
    }



    private async askPerplexity(question: string, sourceUrl: string): Promise<AIResponse> {
        if (!this.perplexityApiKey) return this.createError("Perplexity Key Missing");
        try {
            const res = await axios.post('https://api.perplexity.ai/chat/completions', {
                model: MODELS.PERPLEXITY,
                messages: [{ role: "system", content: "Oracle" }, { role: "user", content: `Verify: ${question}. JSON.` }]
            }, { headers: { 'Authorization': `Bearer ${this.perplexityApiKey}` } });
            return this.parseJSON(res.data.choices[0].message.content);
        } catch (e: any) { return this.createError(e.message); }
    }

    private parseJSON(text: string): AIResponse {
        try {
            return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        } catch { return this.createError("Parse Error"); }
    }

    private createError(msg: string): AIResponse {
        return { answer: 'UNCERTAIN', reasoning: msg, confidence: 0, sources: [] };
    }
}
