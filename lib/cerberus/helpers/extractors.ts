/**
 * Text Extractors & Utilities
 * Helper functions for parsing and extracting data from text
 */

// ===== CRYPTO SYMBOL EXTRACTION =====
const CRYPTO_SYMBOLS = [
    'BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'ADA', 'DOGE', 'SHIB', 'MATIC', 'DOT',
    'AVAX', 'LINK', 'UNI', 'ATOM', 'LTC', 'BCH', 'TRX', 'NEAR', 'APT', 'ARB',
    'OP', 'FTM', 'ALGO', 'VET', 'SAND', 'MANA', 'AXS', 'AAVE', 'MKR', 'CRV'
];

export function extractSymbol(text: string): string | null {
    const upperText = text.toUpperCase();

    // Check for $SYMBOL pattern first
    const dollarMatch = upperText.match(/\$([A-Z]{2,10})/);
    if (dollarMatch) return dollarMatch[1];

    // Check known crypto symbols
    for (const symbol of CRYPTO_SYMBOLS) {
        if (upperText.includes(symbol)) {
            return symbol;
        }
    }

    return null;
}

// ===== SOLANA TOKEN ADDRESS EXTRACTION =====
export function extractTokenAddress(title: string, url: string): string | null {
    const combined = `${title} ${url}`;

    // Solana addresses are base58, typically 32-44 chars
    const solanaPattern = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    const matches = combined.match(solanaPattern);

    if (matches) {
        // Filter out common false positives (URLs, etc)
        const validAddresses = matches.filter(addr =>
            addr.length >= 32 &&
            addr.length <= 44 &&
            !addr.includes('http') &&
            !addr.includes('www')
        );
        return validAddresses[0] || null;
    }

    return null;
}

// ===== PERSON NAME EXTRACTION =====
export function extractPersonName(text: string): string | null {
    // Look for capitalized word pairs (First Last)
    const namePattern = /([A-Z][a-z]+\s[A-Z][a-z]+)/g;
    const matches = text.match(namePattern);

    if (matches && matches.length > 0) {
        // Filter common false positives
        const filtered = matches.filter(name =>
            !['New York', 'Los Angeles', 'San Francisco', 'United States'].includes(name)
        );
        return filtered[0] || null;
    }

    return null;
}

// ===== QUOTE EXTRACTION =====
export function extractQuote(text: string): string | null {
    // Match text in quotes
    const patterns = [
        /"([^"]+)"/,  // Double quotes
        /'([^']+)'/,  // Single quotes
        /\u201c([^\u201d]+)\u201d/,  // Smart quotes
        /\u00ab([^\u00bb]+)\u00bb/   // Guillemets
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1].length > 10) {
            return match[1];
        }
    }

    return null;
}

// ===== DATE EXTRACTION =====
export function extractDate(text: string): Date | null {
    const patterns = [
        // ISO format
        /(\d{4}-\d{2}-\d{2})/,
        // US format: Month Day, Year
        /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/i,
        // Short format: Jan 15, 2024
        /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}/i,
        // Numeric: 01/15/2024 or 15/01/2024
        /(\d{1,2}\/\d{1,2}\/\d{4})/
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            try {
                return new Date(match[0]);
            } catch {
                continue;
            }
        }
    }

    return null;
}

// ===== LEVENSHTEIN DISTANCE (Similarity) =====
export function calculateSimilarity(str1: string, str2: string): number {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();

    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    // Create matrix
    const matrix: number[][] = [];

    for (let i = 0; i <= s1.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= s2.length; j++) {
        matrix[0][j] = j;
    }

    // Fill matrix
    for (let i = 1; i <= s1.length; i++) {
        for (let j = 1; j <= s2.length; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // deletion
                matrix[i][j - 1] + 1,      // insertion
                matrix[i - 1][j - 1] + cost // substitution
            );
        }
    }

    const distance = matrix[s1.length][s2.length];
    const maxLength = Math.max(s1.length, s2.length);

    return 1 - (distance / maxLength);
}

// ===== CATEGORY DETECTION =====
const CATEGORY_PATTERNS: Record<string, RegExp[]> = {
    CRYPTO: [/bitcoin|btc|ethereum|eth|crypto|blockchain|defi/i],
    TRENCHES: [/memecoin|pump\.fun|solana\s+token|rug\s+pull|degen/i],
    POLITICS: [/election|president|congress|senate|vote|politic/i],
    SPORTS: [/nba|nfl|soccer|football|baseball|championship|game\s+\d/i],
    GAMING: [/esports|twitch|steam|game\s+release|gaming/i],
    MUSIC: [/album|concert|spotify|grammy|billboard|artist/i],
    MOVIES: [/movie|film|box\s+office|oscar|netflix|cinema/i],
    WEATHER: [/weather|temperature|storm|hurricane|forecast/i],
    FINANCE: [/stock|nasdaq|dow|earnings|market\s+cap|ipo/i],
    SCIENCE: [/study|research|discover|experiment|journal/i],
    EARTH: [/earthquake|volcano|tsunami|seismic|disaster/i],
    CULTURE: [/viral|trend|meme|celebrity|influencer/i],
    MENTIONS: [/said|stated|announced|claimed|mentioned/i]
};

export function detectCategory(text: string): string {
    const lowerText = text.toLowerCase();

    let bestMatch = 'OTHER';
    let bestScore = 0;

    for (const [category, patterns] of Object.entries(CATEGORY_PATTERNS)) {
        let score = 0;
        for (const pattern of patterns) {
            const matches = lowerText.match(pattern);
            if (matches) score += matches.length;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMatch = category;
        }
    }

    return bestMatch;
}

// ===== URL VALIDATORS =====
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

export function getDomain(url: string): string | null {
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}
