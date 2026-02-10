/**
 * CERBERUS - 3-Dogs Oracle Engine
 * Integrated into Djinn Protocol
 *
 * Previously a standalone repo (cerberus-djinn).
 * Now lives inside lib/cerberus/ as part of the Djinn monorepo.
 */

// Core engine
export { runCerberusValidation, runCerberus } from './engine';
export type { DogResult, Dog1Result, Dog2Result, Dog3Result, CerberusResult } from './engine';

// Orchestrator
export { CerberusOrchestrator, createOrchestrator } from './orchestrator';

// LLM Layer
export { queryLLM } from './llm-layer';

// Types
export type {
    MarketData,
    MarketStatus,
    MarketCategory,
    CerberusVerdict,
    CerberusConfig,
    DashboardState,
    DashboardMarket,
    ValidationVerdict,
    LLMVerdict,
} from './types';
export { DEFAULT_CONFIG } from './types';

// Services
export { searchTweets, getUserRecentTweets, getTweetById, didUserTweetKeyword, checkTweetMetric } from './services/composio-twitter';
export { resolveTwitterMarket, checkTwitterMarket, extractTwitterMarketData, getPollingIntervalMs } from './services/twitter-resolver';

// Helpers
export { extractSymbol, extractTokenAddress, detectCategory, extractDate, extractPersonName, extractQuote, calculateSimilarity, isValidUrl, getDomain } from './helpers/extractors';
export { analyzeUserSource, extractKeywords, assessCredibility } from './helpers/source-analyzer';
