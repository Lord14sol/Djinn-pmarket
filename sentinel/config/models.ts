export const MODELS = {
    GEMINI: "gemini-2.5-flash",
    GPT: "gpt-4o-mini", // Switching to mini to save quota if possible
    PERPLEXITY: "sonar-pro",
};

export const AGENT_CONFIG = {
    CHECK_INTERVAL_MS: 30000, // 30 seconds
    MAX_CONCURRENT_RESOLUTIONS: 5,
    MIN_CONFIDENCE_THRESHOLD: 0.85, // Require 85% confidence for auto-resolve
    RETRY_LIMIT: 3,
};
