/**
 * Source Analyzer - Analyzes user-provided URLs for market verification
 * Used by DOG 1 (HUNTER) to extract and evaluate source content
 */

import * as cheerio from 'cheerio';
import { YoutubeTranscript } from 'youtube-transcript';

// ===== TYPES =====
export interface SourceAnalysisResult {
    accessible: boolean;
    contentType: 'article' | 'video' | 'api' | 'social' | 'unknown';
    title?: string;
    contentPreview: string;
    fullText?: string;
    keywords: string[];
    relevance: 'HIGH' | 'MEDIUM' | 'LOW';
    credibility: 'HIGH' | 'MEDIUM' | 'LOW';
    error?: string;
}

// ===== MAIN ANALYZER =====
export async function analyzeUserSource(url: string, category: string): Promise<SourceAnalysisResult> {
    try {
        // Detect URL type
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            return await analyzeYouTubeSource(url, category);
        }

        if (url.includes('twitter.com') || url.includes('x.com')) {
            return analyzeSocialSource(url, 'twitter');
        }

        // For normal URLs - fetch and analyze
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
            },
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return {
                accessible: false,
                contentType: 'unknown',
                contentPreview: '',
                keywords: [],
                relevance: 'LOW',
                credibility: 'LOW',
                error: `HTTP ${response.status}`
            };
        }

        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('text/html')) {
            const html = await response.text();
            return analyzeHTMLSource(html, url, category);
        }

        if (contentType.includes('application/json')) {
            const json = await response.json();
            return analyzeJSONSource(json, url, category);
        }

        return {
            accessible: true,
            contentType: 'unknown',
            contentPreview: 'Content type not supported for analysis',
            keywords: [],
            relevance: 'LOW',
            credibility: 'MEDIUM'
        };

    } catch (error: any) {
        return {
            accessible: false,
            contentType: 'unknown',
            contentPreview: '',
            keywords: [],
            relevance: 'LOW',
            credibility: 'LOW',
            error: error.message
        };
    }
}

// ===== YOUTUBE ANALYZER =====
async function analyzeYouTubeSource(url: string, category: string): Promise<SourceAnalysisResult> {
    try {
        const videoId = extractVideoId(url);
        if (!videoId) {
            return {
                accessible: false,
                contentType: 'video',
                contentPreview: 'Could not extract video ID',
                keywords: [],
                relevance: 'LOW',
                credibility: 'LOW',
                error: 'Invalid YouTube URL'
            };
        }

        const transcript = await YoutubeTranscript.fetchTranscript(videoId);
        const fullText = transcript.map(t => t.text).join(' ');
        const keywords = extractKeywords(fullText, category);

        return {
            accessible: true,
            contentType: 'video',
            contentPreview: fullText.substring(0, 500),
            fullText: fullText,
            keywords,
            relevance: keywords.length > 3 ? 'HIGH' : keywords.length > 1 ? 'MEDIUM' : 'LOW',
            credibility: 'MEDIUM'
        };
    } catch (error: any) {
        return {
            accessible: false,
            contentType: 'video',
            contentPreview: '',
            keywords: [],
            relevance: 'LOW',
            credibility: 'LOW',
            error: `YouTube transcript error: ${error.message}`
        };
    }
}

// ===== HTML ANALYZER =====
function analyzeHTMLSource(html: string, url: string, category: string): SourceAnalysisResult {
    const $ = cheerio.load(html);

    // Extract article text
    const articleText = $('article').text() || $('main').text() || $('body').text();
    const cleanText = articleText.replace(/\s+/g, ' ').trim();

    // Extract title
    const title = $('h1').first().text() || $('title').text() || '';

    // Detect keywords
    const keywords = extractKeywords(cleanText, category);

    // Assess credibility by domain
    const credibility = assessCredibility(url);

    // Assess relevance
    const relevance = keywords.length > 3 ? 'HIGH' : keywords.length > 1 ? 'MEDIUM' : 'LOW';

    return {
        accessible: true,
        contentType: 'article',
        title: title.trim(),
        contentPreview: cleanText.substring(0, 500),
        fullText: cleanText,
        keywords,
        relevance,
        credibility
    };
}

// ===== JSON ANALYZER =====
function analyzeJSONSource(json: any, url: string, category: string): SourceAnalysisResult {
    const jsonString = JSON.stringify(json, null, 2);
    const keywords = extractKeywords(jsonString, category);

    return {
        accessible: true,
        contentType: 'api',
        contentPreview: jsonString.substring(0, 500),
        fullText: jsonString,
        keywords,
        relevance: keywords.length > 2 ? 'HIGH' : 'MEDIUM',
        credibility: 'HIGH' // API data is typically reliable
    };
}

// ===== SOCIAL ANALYZER =====
function analyzeSocialSource(url: string, platform: string): SourceAnalysisResult {
    // Twitter/X requires authentication for scraping - mark as social
    return {
        accessible: true,
        contentType: 'social',
        contentPreview: `Social media link (${platform}) - requires manual verification`,
        keywords: [],
        relevance: 'MEDIUM',
        credibility: 'LOW' // Social media is less reliable
    };
}

// ===== KEYWORD EXTRACTION =====
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    CRYPTO: ['bitcoin', 'btc', 'ethereum', 'eth', 'price', 'market cap', 'trading', 'crypto', 'blockchain', 'defi'],
    TRENCHES: ['memecoin', 'launch', 'rug pull', 'liquidity', 'holders', 'pump', 'dump', 'solana', 'sol', 'dex'],
    POLITICS: ['election', 'vote', 'congress', 'senate', 'president', 'law', 'policy', 'government', 'campaign'],
    SPORTS: ['game', 'score', 'win', 'championship', 'tournament', 'match', 'team', 'player', 'league'],
    GAMING: ['game', 'esports', 'tournament', 'player', 'championship', 'steam', 'twitch', 'streamer'],
    MUSIC: ['album', 'song', 'artist', 'concert', 'tour', 'billboard', 'grammy', 'spotify', 'release'],
    MOVIES: ['movie', 'film', 'box office', 'premiere', 'oscar', 'actor', 'director', 'netflix', 'cinema'],
    WEATHER: ['temperature', 'forecast', 'storm', 'rain', 'snow', 'hurricane', 'tornado', 'weather'],
    FINANCE: ['stock', 'market', 'trading', 'investment', 'nasdaq', 'dow', 'earnings', 'ipo'],
    SCIENCE: ['study', 'research', 'discovery', 'experiment', 'journal', 'scientist', 'publication'],
    EARTH: ['earthquake', 'volcano', 'tsunami', 'disaster', 'seismic', 'magnitude', 'epicenter'],
    CULTURE: ['trend', 'viral', 'meme', 'internet', 'social media', 'celebrity', 'influencer'],
    MENTIONS: ['said', 'stated', 'announced', 'claimed', 'mentioned', 'quote', 'interview']
};

export function extractKeywords(text: string, category?: string): string[] {
    const lowerText = text.toLowerCase();
    const foundKeywords: string[] = [];

    // Check category-specific keywords
    if (category && CATEGORY_KEYWORDS[category]) {
        for (const kw of CATEGORY_KEYWORDS[category]) {
            if (lowerText.includes(kw)) {
                foundKeywords.push(kw);
            }
        }
    }

    // Check all categories if no specific match
    if (foundKeywords.length === 0) {
        for (const [, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
            for (const kw of keywords) {
                if (lowerText.includes(kw) && !foundKeywords.includes(kw)) {
                    foundKeywords.push(kw);
                }
            }
        }
    }

    return foundKeywords.slice(0, 10); // Limit to 10 keywords
}

// ===== CREDIBILITY ASSESSMENT =====
const HIGH_CREDIBILITY_DOMAINS = [
    'reuters.com', 'bloomberg.com', 'coindesk.com', 'cointelegraph.com',
    'espn.com', 'bbc.com', 'bbc.co.uk', 'cnn.com', 'nytimes.com', 'wsj.com',
    'theguardian.com', 'washingtonpost.com', 'forbes.com', 'businessinsider.com',
    'techcrunch.com', 'wired.com', 'arstechnica.com', 'binance.com', 'coingecko.com'
];

const MEDIUM_CREDIBILITY_DOMAINS = [
    'medium.com', 'substack.com', 'reddit.com', 'twitter.com', 'x.com',
    'youtube.com', 'youtu.be', 'github.com', 'decrypt.co', 'theblock.co'
];

export function assessCredibility(url: string): 'HIGH' | 'MEDIUM' | 'LOW' {
    try {
        const domain = new URL(url).hostname.toLowerCase();

        if (HIGH_CREDIBILITY_DOMAINS.some(d => domain.includes(d))) return 'HIGH';
        if (MEDIUM_CREDIBILITY_DOMAINS.some(d => domain.includes(d))) return 'MEDIUM';
        return 'LOW';
    } catch {
        return 'LOW';
    }
}

// ===== VIDEO ID EXTRACTION =====
export function extractVideoId(url: string): string | null {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}
