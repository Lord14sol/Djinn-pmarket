/**
 * Centralized color mapping for market outcomes
 * Used across ProbabilityChart, HoldingsPanel, and other components
 */

export const OUTCOME_COLORS: Record<string, string> = {
    // Binary outcomes
    YES: "#10B981",
    NO: "#F492B7",
    Yes: "#10B981",
    No: "#F492B7",

    // Countries
    CHILE: "#EF4444",
    Chile: "#EF4444",
    PERU: "#10B981",
    Peru: "#10B981",
    BRAZIL: "#FCD116",
    Brazil: "#FCD116",
    BRASIL: "#FCD116",
    Brasil: "#FCD116",
    ARGENTINA: "#75AADB",
    Argentina: "#75AADB",
    FRANCE: "#002395",
    France: "#002395",
    BOLIVIA: "#F97316",
    Bolivia: "#F97316",
};

/**
 * Get color for a given outcome title
 * Falls back to blue if no match is found
 */
export function getOutcomeColor(title: string): string {
    if (!title) return "#3b82f6";

    // Try exact match first
    if (OUTCOME_COLORS[title]) {
        return OUTCOME_COLORS[title];
    }

    // Try uppercase match
    const upperTitle = title.toUpperCase();
    if (OUTCOME_COLORS[upperTitle]) {
        return OUTCOME_COLORS[upperTitle];
    }

    // Try contains match for countries
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('chile')) return OUTCOME_COLORS.Chile;
    if (lowerTitle.includes('peru')) return OUTCOME_COLORS.Peru;
    if (lowerTitle.includes('brazil') || lowerTitle.includes('brasil')) return OUTCOME_COLORS.Brazil;
    if (lowerTitle.includes('argentina')) return OUTCOME_COLORS.Argentina;
    if (lowerTitle.includes('france')) return OUTCOME_COLORS.France;
    if (lowerTitle.includes('bolivia')) return OUTCOME_COLORS.Bolivia;
    if (lowerTitle.includes('yes')) return OUTCOME_COLORS.YES;
    if (lowerTitle.includes('no')) return OUTCOME_COLORS.NO;

    // Default fallback
    return "#3b82f6";
}
