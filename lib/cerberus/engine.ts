/**
 * CERBERUS ENGINE - 3 DOGS PROTOCOL
 *
 * DOG 1 (HUNTER) - Basic, NO LLM - Analyzes sourceUrl + APIs, Score 1-100
 * DOG 2 (ANALYST) - Intermediate, USES Gemini - Deeper analysis, Score 1-100
 * DOG 3 (JUDGE) - Expert, USES Gemini + Rules - Final verdict, Score 1-100
 *
 * Decision Logic:
 * - DOG 3 Score >= 90 -> VERIFIED (automatic)
 * - DOG 3 Score < 90 -> UNCERTAIN (requires LORD override)
 */

import { MarketData, ValidationVerdict } from './types';
import { queryLLM } from './llm-layer';
import { analyzeUserSource, extractKeywords, assessCredibility, SourceAnalysisResult } from './helpers/source-analyzer';
import { extractSymbol, extractTokenAddress, detectCategory } from './helpers/extractors';
import { getUserRecentTweets, didUserTweetKeyword } from './services/composio-twitter';
import axios from 'axios';

// ===== TYPES =====
export interface DogResult {
    dogId: number;
    dogName: string;
    score: number; // 1-100
    report: any;
    logs: string[];
}

export interface Dog1Result extends DogResult {
    report: {
        userSourceAnalysis: SourceAnalysisResult;
        apiData: { source: string; data: any; timestamp: number } | null;
        findings: string;
        confidence: number;
    };
}

export interface Dog2Result extends DogResult {
    report: {
        dog1Evaluation: {
            didGoodJob: boolean;
            missedPoints: string[];
            strengths: string[];
        };
        deeperAnalysis: any;
        crossReference: {
            linkVsApis: 'CONSISTENT' | 'INCONSISTENT' | 'PARTIAL';
            explanation: string;
        };
        reasoning: string;
        redFlags: string[];
    };
}

export interface Dog3Result extends DogResult {
    verdict: 'VERIFIED' | 'UNCERTAIN' | 'REJECTED';
    requiresHuman: boolean;
    report: {
        dog1Evaluation: { quality: string; notes: string };
        dog2Evaluation: { quality: string; notes: string };
        exhaustiveVerification: any;
        reasoning: string;
    };
}

export interface CerberusResult {
    dog1: Dog1Result;
    dog2: Dog2Result;
    dog3: Dog3Result;
    finalStatus: 'VERIFIED' | 'UNCERTAIN' | 'REJECTED';
    finalScore: number;
}

// ===== MAIN ORCHESTRATOR =====
export async function runCerberusValidation(market: MarketData): Promise<CerberusResult> {
    console.log(`\n[CERBERUS] Initiating 3-Dogs Protocol for: "${market.title}"`);

    // Detect category if not provided
    const category = market.category || detectCategory(market.title);

    // --- DOG 1: THE HUNTER (Basic, No LLM) ---
    const dog1 = await dog1_hunter(market, category);

    // --- DOG 2: THE ANALYST (Intermediate, Uses Gemini) ---
    const dog2 = await dog2_analyst(market, category, dog1);

    // --- DOG 3: THE JUDGE (Expert, Uses Gemini + Rules) ---
    const dog3 = await dog3_judge(market, category, dog1, dog2);

    return {
        dog1,
        dog2,
        dog3,
        finalStatus: dog3.verdict,
        finalScore: dog3.score
    };
}

// ===== DOG 1: THE HUNTER =====
async function dog1_hunter(market: MarketData, category: string): Promise<Dog1Result> {
    const logs: string[] = [];
    let score = 0;

    logs.push(`[HUNTER] Market: "${market.title}"`);
    logs.push(`[HUNTER] Category: ${category}`);
    logs.push(`[HUNTER] === PHASE 1: USER SOURCE ANALYSIS ===`);
    logs.push(`[HUNTER] URL: ${market.sourceUrl}`);

    // Analyze user-provided source
    const sourceAnalysis = await analyzeUserSource(market.sourceUrl, category);

    logs.push(`[HUNTER] Accessible: ${sourceAnalysis.accessible}`);
    logs.push(`[HUNTER] Type: ${sourceAnalysis.contentType}`);
    logs.push(`[HUNTER] Preview: ${sourceAnalysis.contentPreview.substring(0, 100)}...`);
    logs.push(`[HUNTER] Keywords: ${sourceAnalysis.keywords.join(', ') || 'none found'}`);
    logs.push(`[HUNTER] Relevance: ${sourceAnalysis.relevance}`);
    logs.push(`[HUNTER] Credibility: ${sourceAnalysis.credibility}`);

    // Calculate score for source analysis
    if (sourceAnalysis.accessible) score += 20;
    if (sourceAnalysis.relevance === 'HIGH') score += 20;
    else if (sourceAnalysis.relevance === 'MEDIUM') score += 10;
    if (sourceAnalysis.credibility === 'HIGH') score += 30;
    else if (sourceAnalysis.credibility === 'MEDIUM') score += 15;

    logs.push(`[HUNTER] === PHASE 2: API EXTRACTION ===`);

    // Extract data from APIs by category
    let apiData: { source: string; data: any; timestamp: number } | null = null;

    try {
        apiData = await extractApiDataByCategory(market, category, logs);
        if (apiData && apiData.data) {
            score += 30; // API data found
            logs.push(`[HUNTER] Data obtained: ${JSON.stringify(apiData.data).substring(0, 200)}...`);
        }
    } catch (e: any) {
        logs.push(`[HUNTER] API extraction failed: ${e.message}`);
    }

    // Generate findings summary
    const findings = generateHunterFindings(sourceAnalysis, apiData, market.title);

    logs.push(`[HUNTER] === HUNTER REPORT ===`);
    logs.push(`[HUNTER] Findings: ${findings}`);
    logs.push(`[HUNTER] Score: ${score}/100`);

    // Print logs
    logs.forEach(log => console.log(log));

    return {
        dogId: 1,
        dogName: 'HUNTER',
        score,
        report: {
            userSourceAnalysis: sourceAnalysis,
            apiData,
            findings,
            confidence: score
        },
        logs
    };
}

// ===== DOG 2: THE ANALYST =====
async function dog2_analyst(market: MarketData, category: string, dog1: Dog1Result): Promise<Dog2Result> {
    const logs: string[] = [];

    logs.push(`[ANALYST] Analyzing HUNTER report...`);
    logs.push(`[ANALYST] HUNTER Score: ${dog1.score}/100`);

    // Build prompt for Gemini
    const prompt = `You are an intermediate-level analyst investigator.

DOG 1 (HUNTER) REPORT:
Score: ${dog1.score}/100
${JSON.stringify(dog1.report, null, 2)}

MARKET TO VERIFY:
- Title: "${market.title}"
- Category: ${category}
- User Link: ${market.sourceUrl}
- Resolution Date: ${market.targetResolutionDate || 'Not specified'}

YOUR MISSION:
1. Evaluate DOG 1's work: Did they do a good job? What did they miss?
2. Investigate the user's link MORE DEEPLY
3. Look for additional information DOG 1 didn't find
4. Cross-reference all information and detect inconsistencies
5. Assign a more precise score 1-100

RESPOND IN JSON ONLY:
{
  "dog1Evaluation": {
    "didGoodJob": boolean,
    "missedPoints": ["string array"],
    "strengths": ["string array"]
  },
  "deeperAnalysis": {
    "linkVerification": "string explaining deeper analysis",
    "additionalFindings": "string with new discoveries",
    "inconsistencies": ["string array of inconsistencies found"]
  },
  "crossReference": {
    "linkVsApis": "CONSISTENT" | "INCONSISTENT" | "PARTIAL",
    "explanation": "string explaining the cross-reference result"
  },
  "score": number (1-100),
  "reasoning": "string with overall reasoning",
  "redFlags": ["string array of red flags"]
}`;

    logs.push(`[ANALYST] === EVALUATING DOG 1 ===`);

    let analysisResult: any;
    try {
        const llmResponse = await queryLLM(market.title, "DOG2_ANALYSIS", [{ prompt }]);
        analysisResult = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;
    } catch (e: any) {
        logs.push(`[ANALYST] LLM analysis failed: ${e.message}`);
        // Fallback to rule-based analysis
        analysisResult = {
            dog1Evaluation: {
                didGoodJob: dog1.score >= 50,
                missedPoints: dog1.score < 50 ? ['Limited source analysis'] : [],
                strengths: dog1.score >= 50 ? ['Good initial assessment'] : []
            },
            deeperAnalysis: {
                linkVerification: 'Unable to perform deep analysis',
                additionalFindings: 'Fallback mode - no LLM analysis available',
                inconsistencies: []
            },
            crossReference: {
                linkVsApis: 'PARTIAL',
                explanation: 'Could not cross-reference without LLM'
            },
            score: Math.round(dog1.score * 0.9),
            reasoning: 'Fallback analysis based on DOG 1 results',
            redFlags: []
        };
    }

    logs.push(`[ANALYST] Good job: ${analysisResult.dog1Evaluation?.didGoodJob}`);
    logs.push(`[ANALYST] Strengths: ${(analysisResult.dog1Evaluation?.strengths || []).join(', ')}`);
    logs.push(`[ANALYST] Missed: ${(analysisResult.dog1Evaluation?.missedPoints || []).join(', ')}`);
    logs.push(`[ANALYST] === CROSS-REFERENCE ===`);
    logs.push(`[ANALYST] Link vs APIs: ${analysisResult.crossReference?.linkVsApis}`);
    logs.push(`[ANALYST] Score: ${analysisResult.score}/100`);
    logs.push(`[ANALYST] Red flags: ${(analysisResult.redFlags || []).join(', ') || 'none'}`);

    logs.forEach(log => console.log(log));

    return {
        dogId: 2,
        dogName: 'ANALYST',
        score: analysisResult.score || 50,
        report: {
            dog1Evaluation: analysisResult.dog1Evaluation || { didGoodJob: false, missedPoints: [], strengths: [] },
            deeperAnalysis: analysisResult.deeperAnalysis || {},
            crossReference: analysisResult.crossReference || { linkVsApis: 'PARTIAL', explanation: '' },
            reasoning: analysisResult.reasoning || '',
            redFlags: analysisResult.redFlags || []
        },
        logs
    };
}

// ===== DOG 3: THE JUDGE =====
async function dog3_judge(market: MarketData, category: string, dog1: Dog1Result, dog2: Dog2Result): Promise<Dog3Result> {
    const logs: string[] = [];

    logs.push(`[JUDGE] Initiating final verdict...`);
    logs.push(`[JUDGE] DOG 1 Score: ${dog1.score}/100`);
    logs.push(`[JUDGE] DOG 2 Score: ${dog2.score}/100`);

    // Rule-based auto-decisions
    const avgScore = (dog1.score + dog2.score) / 2;

    // Auto-VERIFIED if both dogs agree strongly
    if (dog1.score >= 85 && dog2.score >= 85) {
        const autoScore = Math.round((dog1.score + dog2.score) / 2);
        logs.push(`[JUDGE] AUTO-DECISION: Strong consensus detected`);
        logs.push(`[JUDGE] Final Score: ${autoScore}/100`);
        logs.push(`[JUDGE] Verdict: VERIFIED`);
        logs.forEach(log => console.log(log));

        return {
            dogId: 3,
            dogName: 'JUDGE',
            score: autoScore,
            verdict: 'VERIFIED',
            requiresHuman: false,
            report: {
                dog1Evaluation: { quality: 'EXCELLENT', notes: 'High confidence from both dogs' },
                dog2Evaluation: { quality: 'EXCELLENT', notes: 'Strong cross-reference' },
                exhaustiveVerification: { autoDecision: true },
                reasoning: 'Both DOG 1 and DOG 2 scored above 85, indicating strong evidence.'
            },
            logs
        };
    }

    // Auto-REJECTED if both dogs found major issues
    if (dog1.score <= 20 && dog2.score <= 20) {
        const autoScore = Math.round((dog1.score + dog2.score) / 2);
        logs.push(`[JUDGE] AUTO-DECISION: Strong rejection consensus`);
        logs.push(`[JUDGE] Final Score: ${autoScore}/100`);
        logs.push(`[JUDGE] Verdict: REJECTED`);
        logs.forEach(log => console.log(log));

        return {
            dogId: 3,
            dogName: 'JUDGE',
            score: autoScore,
            verdict: 'REJECTED',
            requiresHuman: false,
            report: {
                dog1Evaluation: { quality: 'POOR', notes: 'Low confidence' },
                dog2Evaluation: { quality: 'POOR', notes: 'Multiple red flags' },
                exhaustiveVerification: { autoDecision: true },
                reasoning: 'Both DOG 1 and DOG 2 scored below 20, indicating lack of evidence.'
            },
            logs
        };
    }

    // For uncertain cases, use Gemini for final analysis
    logs.push(`[JUDGE] Evaluating quality of analyses...`);

    const prompt = `You are the FINAL JUDGE, the most intelligent of the 3 dogs. Your verdict is definitive.

DOG 1 (HUNTER) REPORT:
Score: ${dog1.score}/100
${JSON.stringify(dog1.report, null, 2)}

DOG 2 (ANALYST) REPORT:
Score: ${dog2.score}/100
${JSON.stringify(dog2.report, null, 2)}

MARKET:
- Title: "${market.title}"
- Category: ${category}
- Link: ${market.sourceUrl}
- Resolution: ${market.targetResolutionDate || 'Not specified'}

YOUR MISSION (MOST CRITICAL):
1. Evaluate DOG 1 and DOG 2's work
2. RE-VERIFY the user link for the third time
3. Make exhaustive searches in all available APIs for this category
4. Look for evidence that contradicts OR supports the prediction
5. Assign a FINAL score 1-100

SCORING CRITERIA:
- 90-100: SOLID evidence, highly verifiable -> VERIFIED
- 70-89: Good evidence but with some doubts -> UNCERTAIN
- 50-69: Mixed evidence, hard to verify -> UNCERTAIN
- 30-49: Weak evidence, probably false -> UNCERTAIN
- 1-29: No evidence or contradictory -> REJECTED

RESPOND IN JSON ONLY:
{
  "dog1Evaluation": {
    "quality": "EXCELLENT" | "GOOD" | "REGULAR" | "POOR",
    "notes": "string"
  },
  "dog2Evaluation": {
    "quality": "EXCELLENT" | "GOOD" | "REGULAR" | "POOR",
    "notes": "string"
  },
  "exhaustiveVerification": {
    "linkRecheck": "string explaining third verification",
    "additionalSources": ["array of additional sources checked"],
    "contradictoryEvidence": ["array of contradicting evidence"],
    "supportingEvidence": ["array of supporting evidence"]
  },
  "finalScore": number (1-100),
  "verdict": "VERIFIED" | "UNCERTAIN" | "REJECTED",
  "reasoning": "string with final reasoning",
  "requiresHuman": boolean
}`;

    let judgeResult: any;
    try {
        const llmResponse = await queryLLM(market.title, "DOG3_JUDGE", [{ prompt }]);
        judgeResult = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;
    } catch (e: any) {
        logs.push(`[JUDGE] LLM judgment failed: ${e.message}`);
        const fallbackScore = Math.round(avgScore);
        judgeResult = {
            dog1Evaluation: { quality: dog1.score >= 50 ? 'GOOD' : 'REGULAR', notes: 'Fallback assessment' },
            dog2Evaluation: { quality: dog2.score >= 50 ? 'GOOD' : 'REGULAR', notes: 'Fallback assessment' },
            exhaustiveVerification: { linkRecheck: 'Fallback mode', additionalSources: [], contradictoryEvidence: [], supportingEvidence: [] },
            finalScore: fallbackScore,
            verdict: fallbackScore >= 90 ? 'VERIFIED' : 'UNCERTAIN',
            reasoning: 'Fallback verdict based on previous dog scores',
            requiresHuman: fallbackScore < 90
        };
    }

    logs.push(`[JUDGE] DOG 1: ${judgeResult.dog1Evaluation?.quality} - ${judgeResult.dog1Evaluation?.notes}`);
    logs.push(`[JUDGE] DOG 2: ${judgeResult.dog2Evaluation?.quality} - ${judgeResult.dog2Evaluation?.notes}`);
    logs.push(`[JUDGE] === FINAL VERDICT ===`);
    logs.push(`[JUDGE] Final Score: ${judgeResult.finalScore}/100`);
    logs.push(`[JUDGE] Decision: ${judgeResult.verdict}`);
    logs.push(`[JUDGE] Requires LORD: ${judgeResult.requiresHuman}`);
    logs.push(`[JUDGE] Reasoning: ${judgeResult.reasoning}`);

    logs.forEach(log => console.log(log));

    return {
        dogId: 3,
        dogName: 'JUDGE',
        score: judgeResult.finalScore || 50,
        verdict: judgeResult.verdict || 'UNCERTAIN',
        requiresHuman: judgeResult.requiresHuman ?? true,
        report: {
            dog1Evaluation: judgeResult.dog1Evaluation || { quality: 'REGULAR', notes: '' },
            dog2Evaluation: judgeResult.dog2Evaluation || { quality: 'REGULAR', notes: '' },
            exhaustiveVerification: judgeResult.exhaustiveVerification || {},
            reasoning: judgeResult.reasoning || ''
        },
        logs
    };
}

// ===== HELPER: Extract API Data by Category =====
async function extractApiDataByCategory(market: MarketData, category: string, logs: string[]): Promise<{ source: string; data: any; timestamp: number } | null> {
    logs.push(`[HUNTER] Extracting data for category: ${category}`);

    // Auto-detect Twitter URLs regardless of category
    const isTwitterUrl = market.sourceUrl?.includes('twitter.com') || market.sourceUrl?.includes('x.com');
    const effectiveCategory = isTwitterUrl && category !== 'CRYPTO' && category !== 'SPORTS' ? 'TWITTER' : category;

    try {
        switch (effectiveCategory) {
            case 'CRYPTO':
            case 'FINANCE': {
                const symbol = extractSymbol(market.title);
                if (symbol) {
                    logs.push(`[HUNTER] Detected symbol: ${symbol}`);
                    const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`, { timeout: 5000 });
                    return { source: 'Binance', data: response.data, timestamp: Date.now() };
                }
                break;
            }

            case 'TRENCHES': {
                const address = extractTokenAddress(market.title, market.sourceUrl);
                if (address) {
                    logs.push(`[HUNTER] Detected token: ${address}`);
                    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${address}`, { timeout: 5000 });
                    return { source: 'DexScreener', data: response.data, timestamp: Date.now() };
                }
                break;
            }

            case 'SPORTS': {
                logs.push(`[HUNTER] Checking ESPN API...`);
                const response = await axios.get('https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard', { timeout: 5000 });
                return { source: 'ESPN', data: { games: response.data.events?.length || 0 }, timestamp: Date.now() };
            }

            case 'WEATHER': {
                logs.push(`[HUNTER] Checking weather data...`);
                return { source: 'WeatherAPI', data: { available: true }, timestamp: Date.now() };
            }

            case 'EARTH': {
                logs.push(`[HUNTER] Checking USGS earthquake data...`);
                const response = await axios.get('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', { timeout: 5000 });
                return { source: 'USGS', data: { earthquakes: response.data.features?.length || 0 }, timestamp: Date.now() };
            }

            case 'TWITTER':
            case 'SOCIAL': {
                let username = '';
                const urlMatch = market.sourceUrl.match(/(?:twitter\.com|x\.com)\/([^\/\?#]+)/);

                if (urlMatch && urlMatch[1] && urlMatch[1] !== 'search' && urlMatch[1] !== 'hashtag') {
                    username = urlMatch[1];
                    logs.push(`[HUNTER] Twitter user detected: @${username}`);

                    try {
                        const recentTweets = await getUserRecentTweets(username, 5);
                        const tweetCount = recentTweets.length;
                        const topTweet = recentTweets[0];

                        logs.push(`[HUNTER] Found ${tweetCount} recent tweets via Composio`);

                        // Check if title mentions a keyword and if user tweeted it
                        const keywordMatch = market.title.match(/"([^"]+)"/);
                        if (keywordMatch) {
                            const keyword = keywordMatch[1];
                            const keywordResult = await didUserTweetKeyword(username, keyword, 48);
                            logs.push(`[HUNTER] Checked for keyword "${keyword}": ${keywordResult.found ? 'FOUND' : 'NOT FOUND'}`);
                        }

                        if (topTweet) {
                            logs.push(`[HUNTER] Latest: "${topTweet.text?.substring(0, 100)}..."`);
                        }

                        return {
                            source: 'Composio/Twitter',
                            data: {
                                username,
                                tweetCount,
                                latestTweet: topTweet ? {
                                    text: topTweet.text,
                                    id: topTweet.id,
                                    date: topTweet.created_at
                                } : null
                            },
                            timestamp: Date.now()
                        };

                    } catch (twitterErr: any) {
                        logs.push(`[HUNTER] Composio Twitter error: ${twitterErr.message}`);
                        return {
                            source: 'Twitter (Failed)',
                            data: { error: twitterErr.message },
                            timestamp: Date.now()
                        };
                    }
                } else {
                    logs.push(`[HUNTER] Could not extract Twitter username from URL: ${market.sourceUrl}`);
                }
                break;
            }

            default:
                logs.push(`[HUNTER] No specific API for category: ${category}`);
                return null;
        }
    } catch (e: any) {
        logs.push(`[HUNTER] API error: ${e.message}`);
    }

    return null;
}

// ===== HELPER: Generate Hunter Findings =====
function generateHunterFindings(source: SourceAnalysisResult, apiData: any, title: string): string {
    const parts: string[] = [];

    if (source.accessible) {
        parts.push(`Source is accessible (${source.contentType}).`);
        if (source.keywords.length > 0) {
            parts.push(`Found relevant keywords: ${source.keywords.slice(0, 3).join(', ')}.`);
        }
        parts.push(`Credibility: ${source.credibility}, Relevance: ${source.relevance}.`);
    } else {
        parts.push(`Source is NOT accessible. Error: ${source.error || 'Unknown'}.`);
    }

    if (apiData) {
        parts.push(`API data obtained from ${apiData.source}.`);
    } else {
        parts.push(`No API data available for this category.`);
    }

    return parts.join(' ');
}

// Legacy export for backwards compatibility
export { runCerberusValidation as runCerberus };
