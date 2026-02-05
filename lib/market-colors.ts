/**
 * Centralized color mapping for market outcomes
 * Used across ProbabilityChart, HoldingsPanel, and other components
 */

export const OUTCOME_COLORS: Record<string, string> = {
    // Binary outcomes (synchronized with CreateMarketModal)
    YES: "#10B981",
    NO: "#EF4444",
    Yes: "#10B981",
    No: "#EF4444",

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

// Synchronized with CreateMarketModal COLORS array
const FALLBACK_PALETTE = [
    "#10B981", // Green (Yes)
    "#EF4444", // Red (No)
    "#3B82F6", // Blue
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#14B8A6", // Teal
    "#6366F1", // Indigo
    "#84CC16", // Lime
    "#F97316", // Orange
    "#D946EF", // Fuchsia
    "#F43F5E", // Rose
    "#0EA5E9", // Sky
];

/**
 * Get color for a given outcome title
 * Falls back to a distinct color from the palette if no match is found
 */
export function getOutcomeColor(title: string, index?: number): string {
    if (!title) return FALLBACK_PALETTE[(index || 0) % FALLBACK_PALETTE.length];

    // Handle standard binary outcomes immediately for consistency
    const lowerTitle = title.toLowerCase();
    if (lowerTitle === 'yes' || lowerTitle.includes('yes')) return OUTCOME_COLORS.YES;
    if (lowerTitle === 'no' || lowerTitle.includes('no')) return OUTCOME_COLORS.NO;

    // Try exact match in map
    if (OUTCOME_COLORS[title]) {
        return OUTCOME_COLORS[title];
    }

    // Try uppercase match in map
    const upperTitle = title.toUpperCase();
    if (OUTCOME_COLORS[upperTitle]) {
        return OUTCOME_COLORS[upperTitle];
    }

    // Try specific sub-string matches for countries
    if (lowerTitle.includes('chile')) return OUTCOME_COLORS.Chile;
    if (lowerTitle.includes('peru')) return OUTCOME_COLORS.Peru;
    if (lowerTitle.includes('brazil') || lowerTitle.includes('brasil')) return OUTCOME_COLORS.Brazil;
    if (lowerTitle.includes('argentina')) return OUTCOME_COLORS.Argentina;
    if (lowerTitle.includes('france')) return OUTCOME_COLORS.France;
    if (lowerTitle.includes('bolivia')) return OUTCOME_COLORS.Bolivia;

    // Special case for binary markets with custom names (e.g. "Trump" vs "Harris")
    // If it's the 2nd outcome and we have no match, use Red (No default)
    if (index === 1 && !OUTCOME_COLORS[title]) {
        return "#EF4444"; // Red (No)
    }

    if (index === 0 && !OUTCOME_COLORS[title]) {
        return "#10B981"; // Green (Yes)
    }

    // Default fallback using the index to ensure distinction
    return FALLBACK_PALETTE[(index || 0) % FALLBACK_PALETTE.length];
}
