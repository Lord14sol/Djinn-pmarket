export interface VaultKeys {
    GEMINI_API_KEY: string;
    OPENAI_API_KEY: string;
    PERPLEXITY_API_KEY: string;
    TWITTER_API_KEY?: string;
    YAHOO_FINANCE_KEY?: string;
    YAHOO_FINANCE_HOST?: string;
    RAPIDAPI_KEY?: string;
    BINANCE_API_KEY?: string;
    BINANCE_SECRET_KEY?: string;
    HELIUS_API_KEY?: string;
    HELIUS_RPC_URL?: string;
    BIRDEYE_API_KEY?: string;
    COINGECKO_API_KEY?: string;
    TMDB_API_KEY?: string;
    TMDB_ACCESS_TOKEN?: string;
    PREDICTHQ_API_KEY?: string;
}

export function loadVault(): VaultKeys {
    if (!process.env.GEMINI_API_KEY) console.warn("⚠️  GEMINI_API_KEY missing in .env.local");
    if (!process.env.OPENAI_API_KEY) console.warn("⚠️  OPENAI_API_KEY missing in .env.local");

    return {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
        OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
        PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || '',
        TWITTER_API_KEY: process.env.TWITTER_API_KEY || '',
        YAHOO_FINANCE_KEY: process.env.YAHOO_FINANCE_API_KEY || process.env.YAHOO_FINANCE_KEY || '',
        YAHOO_FINANCE_HOST: process.env.YAHOO_FINANCE_HOST || '',
        RAPIDAPI_KEY: process.env.RAPIDAPI_KEY || '',
        BINANCE_API_KEY: process.env.BINANCE_API_KEY || '',
        BINANCE_SECRET_KEY: process.env.BINANCE_SECRET_KEY || '',
        HELIUS_API_KEY: process.env.HELIUS_API_KEY || '',
        HELIUS_RPC_URL: process.env.HELIUS_RPC_URL || '',
        BIRDEYE_API_KEY: process.env.BIRDEYE_API_KEY || '',
        COINGECKO_API_KEY: process.env.COINGECKO_API_KEY || '',
        TMDB_API_KEY: process.env.TMDB_API_KEY || '',
        TMDB_ACCESS_TOKEN: process.env.TMDB_ACCESS_TOKEN || '',
        PREDICTHQ_API_KEY: process.env.PREDICTHQ_API_KEY || '',
    };
}
