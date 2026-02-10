/**
 * Twitter Market Resolver
 * Handles early resolution of Twitter-based prediction markets
 * E.g. "Will @elonmusk tweet 'DOGE' this week?"
 */

import { didUserTweetKeyword, checkTweetMetric } from './composio-twitter';

// Types for resolution request
interface TwitterResolutionRequest {
    marketId: string;
    type: 'KEYWORD_MENTION' | 'METRIC_THRESHOLD';
    target: string; // @username or tweet_id
    condition: string; // keyword or threshold value
    deadline: number; // timestamp
}

interface ResolutionResult {
    resolved: boolean;
    outcome?: 'YES' | 'NO';
    reason?: string;
}

/**
 * Main resolver function for Twitter markets.
 * This function is called by the Orchestrator periodically.
 */
export async function resolveTwitterMarket(request: TwitterResolutionRequest): Promise<ResolutionResult> {
    console.log(`[RESOLVER] Checking Twitter Market: ${request.marketId} (${request.type})`);

    try {
        // 1. Check Deadline (Time Expiry)
        if (Date.now() > request.deadline) {
            console.log(`[RESOLVER] Market ${request.marketId} expired. Condition not met.`);
            return { resolved: true, outcome: 'NO', reason: 'Deadline exceeded without condition being met.' };
        }

        // 2. Check Condition based on Type
        if (request.type === 'KEYWORD_MENTION') {
            const username = request.target;
            const keyword = request.condition;

            const result = await didUserTweetKeyword(username, keyword, 24);

            if (result.found) {
                console.log(`[RESOLVER] KEYWORD FOUND! Market ${request.marketId} -> YES`);
                return {
                    resolved: true,
                    outcome: 'YES',
                    reason: `User ${username} tweeted "${keyword}"`
                };
            }
        }
        else if (request.type === 'METRIC_THRESHOLD') {
            const tweetId = request.target;
            const threshold = parseInt(request.condition, 10);

            let metric: 'likes' | 'retweets' | 'replies' = 'likes';
            let val = threshold;

            if (request.condition.includes(':')) {
                const parts = request.condition.split(':');
                metric = parts[0] as any;
                val = parseInt(parts[1], 10);
            }

            const result = await checkTweetMetric(tweetId, metric, val);

            if (result.passed) {
                console.log(`[RESOLVER] THRESHOLD MET! Market ${request.marketId} -> YES`);
                return {
                    resolved: true,
                    outcome: 'YES',
                    reason: `Tweet ${tweetId} reached ${val} ${metric}`
                };
            }
        }

        // 3. Condition not met yet, but deadline active -> Wait
        return { resolved: false };

    } catch (error: any) {
        console.error(`[RESOLVER] Error resolving market ${request.marketId}:`, error.message);

        // Handle DELETED TWEET or USER NOT FOUND explicitly
        const errorMsg = (error.message || '').toLowerCase();
        if (errorMsg.includes('not found') || errorMsg.includes('deleted') || errorMsg.includes('suspended')) {
            console.log(`[RESOLVER] Target source DELETED/SUSPENDED. Market ${request.marketId} -> NO`);
            return {
                resolved: true,
                outcome: 'NO',
                reason: 'Source content was deleted or user suspended before resolution.'
            };
        }

        return { resolved: false, reason: 'API Error' };
    }
}

// Re-export types used by orchestrator
export type { TwitterResolutionRequest, ResolutionResult };

// Types used by the orchestrator for Twitter market tracking
export interface TwitterMarketData {
    marketId: string;
    title: string;
    twitterMarketType: 'KEYWORD_MENTION' | 'METRIC_THRESHOLD';
    targetUsername?: string;
    targetKeyword?: string;
    targetTweetId?: string;
    metricThreshold?: number;
    expiresAt: number;
}

export interface ResolutionReport {
    result: 'YES' | 'NO' | 'PENDING' | 'UNCERTAIN';
    evidence: string;
    isEarlyResolution: boolean;
}

/**
 * Extract Twitter market data from a market object
 */
export function extractTwitterMarketData(market: any): TwitterMarketData | null {
    if (!market.target_username && !market.target_tweet_id) return null;

    return {
        marketId: market.publicKey,
        title: market.title,
        twitterMarketType: market.twitter_market_type === 'METRIC_THRESHOLD' ? 'METRIC_THRESHOLD' : 'KEYWORD_MENTION',
        targetUsername: market.target_username,
        targetKeyword: market.target_keyword,
        targetTweetId: market.target_tweet_id,
        metricThreshold: market.metric_threshold,
        expiresAt: market.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000, // Default 7 days
    };
}

/**
 * Check a Twitter market for resolution
 */
export async function checkTwitterMarket(data: TwitterMarketData): Promise<ResolutionReport> {
    if (data.twitterMarketType === 'KEYWORD_MENTION' && data.targetUsername && data.targetKeyword) {
        const result = await resolveTwitterMarket({
            marketId: data.marketId,
            type: 'KEYWORD_MENTION',
            target: data.targetUsername,
            condition: data.targetKeyword,
            deadline: data.expiresAt,
        });

        if (result.resolved) {
            return {
                result: result.outcome!,
                evidence: result.reason || '',
                isEarlyResolution: Date.now() < data.expiresAt,
            };
        }
        return { result: 'PENDING', evidence: 'Condition not met yet', isEarlyResolution: false };
    }

    if (data.twitterMarketType === 'METRIC_THRESHOLD' && data.targetTweetId) {
        const result = await resolveTwitterMarket({
            marketId: data.marketId,
            type: 'METRIC_THRESHOLD',
            target: data.targetTweetId,
            condition: `likes:${data.metricThreshold || 1000}`,
            deadline: data.expiresAt,
        });

        if (result.resolved) {
            return {
                result: result.outcome!,
                evidence: result.reason || '',
                isEarlyResolution: Date.now() < data.expiresAt,
            };
        }
        return { result: 'PENDING', evidence: 'Threshold not reached yet', isEarlyResolution: false };
    }

    return { result: 'UNCERTAIN', evidence: 'Insufficient data for resolution', isEarlyResolution: false };
}

/**
 * Get dynamic polling interval based on how close we are to deadline
 */
export function getPollingIntervalMs(data: TwitterMarketData): number {
    const hoursLeft = (data.expiresAt - Date.now()) / (1000 * 60 * 60);

    if (hoursLeft <= 1) return 2 * 60 * 1000;   // Last hour: every 2 min
    if (hoursLeft <= 6) return 5 * 60 * 1000;   // Last 6h: every 5 min
    if (hoursLeft <= 24) return 15 * 60 * 1000;  // Last 24h: every 15 min
    return 30 * 60 * 1000;                       // Default: every 30 min
}
