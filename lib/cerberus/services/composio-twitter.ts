/**
 * Composio Twitter Integration
 * Authenticated Twitter search & data via Composio API
 * Used for verifying Twitter-based prediction markets
 */

import axios from 'axios';

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || '';
const COMPOSIO_BASE_URL = 'https://backend.composio.dev/api/v1';

// In-memory cache with TTL
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const DAILY_BUDGET = 666; // Max requests per day

interface CacheEntry {
    data: any;
    timestamp: number;
}

let requestCount = 0;
let lastReset = Date.now();

const memoryCache = new Map<string, CacheEntry>();

function checkBudget(): boolean {
    const now = Date.now();
    if (now - lastReset > 24 * 60 * 60 * 1000) {
        requestCount = 0;
        lastReset = now;
    }
    if (requestCount >= DAILY_BUDGET) {
        console.warn(`[TWITTER] Daily budget exceeded (${DAILY_BUDGET}). Requests blocked.`);
        return false;
    }
    return true;
}

async function executeComposioAction(actionId: string, params: any) {
    if (!checkBudget()) return null;

    try {
        const headers: any = {
            'Authorization': COMPOSIO_API_KEY,
            'Content-Type': 'application/json'
        };

        // Use connection ID if provided (e.g. for a specific authenticated Twitter account)
        if (process.env.COMPOSIO_CONNECTION_ID) {
            headers['x-composio-connection-id'] = process.env.COMPOSIO_CONNECTION_ID;
        }

        const payload = {
            action: actionId,
            app: "twitter",
            params: params,
            connection_id: process.env.COMPOSIO_CONNECTION_ID
        };

        console.log(`[COMPOSIO] Executing ${actionId}...`, JSON.stringify(params));

        const response = await axios.post(`${COMPOSIO_BASE_URL}/actions/execute`, payload, { headers });

        requestCount++;
        return response.data;
    } catch (error: any) {
        console.error(`[COMPOSIO] Error executing ${actionId}:`, error.response?.data || error.message);
        return null;
    }
}

// --- PUBLIC API ---

export async function searchTweets(query: string, limit: number = 5) {
    const cacheKey = `search:${query}:${limit}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.data;
    }

    const result = await executeComposioAction("twitter_search_tweets", { query, limit });

    // Normalize response: Composio returns varied structures.
    const tweets = result?.data?.tweets || result?.tweets || [];

    if (tweets) {
        memoryCache.set(cacheKey, { data: tweets, timestamp: Date.now() });
    }
    return tweets;
}

export async function getUserRecentTweets(username: string, limit: number = 5) {
    // Strip @ if present
    const cleanUser = username.replace('@', '');
    const cacheKey = `timeline:${cleanUser}:${limit}`;

    // Cache check
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) return cached.data;

    // Action: twitter_user_timeline
    const result = await executeComposioAction("twitter_user_timeline", { username: cleanUser, limit });

    const tweets = result?.data?.tweets || result?.tweets || [];
    if (tweets) {
        memoryCache.set(cacheKey, { data: tweets, timestamp: Date.now() });
    }
    return tweets;
}

export async function getTweetById(tweetId: string) {
    const cacheKey = `tweet:${tweetId}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached.data;

    const result = await executeComposioAction("twitter_get_tweet", { tweet_id: tweetId });

    const tweet = result?.data || result?.tweet || null;
    if (tweet) {
        memoryCache.set(cacheKey, { data: tweet, timestamp: Date.now() });
    }
    return tweet;
}

/**
 * Checks if a specific user tweeted a keyword within the last X hours.
 */
export async function didUserTweetKeyword(username: string, keyword: string, hoursBack: number = 24) {
    const tweets = await getUserRecentTweets(username, 20); // Fetch last 20 tweets to be safe
    if (!tweets || !Array.isArray(tweets)) return { found: false };

    const cutoff = Date.now() - (hoursBack * 60 * 60 * 1000);
    const normalizedKeyword = keyword.toLowerCase();

    // Iterate
    for (const t of tweets) {
        const createdAt = new Date(t.created_at).getTime();
        if (createdAt < cutoff) continue; // Too old

        const text = (t.text || "").toLowerCase();
        if (text.includes(normalizedKeyword)) {
            return { found: true, tweet: t };
        }
    }

    return { found: false };
}

/**
 * Checks if a tweet has reached a metric threshold (e.g. 1000 likes).
 */
export async function checkTweetMetric(tweetId: string, metric: 'likes' | 'retweets' | 'replies', threshold: number) {
    const tweet = await getTweetById(tweetId);
    if (!tweet) return { passed: false, current: 0 };

    let current = 0;
    const metrics = tweet.public_metrics || {};

    if (metric === 'likes') current = metrics.like_count || 0;
    if (metric === 'retweets') current = metrics.retweet_count || 0;
    if (metric === 'replies') current = metrics.reply_count || 0;

    return { passed: current >= threshold, current };
}
