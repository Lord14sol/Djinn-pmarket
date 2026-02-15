/**
 * djinn_list_markets — Fetch active prediction markets from Djinn API
 *
 * Usage by bot:
 *   "List all active crypto markets"
 *   "Show me sports markets expiring this week"
 */

export interface DjinnMarket {
    id: string;
    publicKey: string;
    question: string;
    category: 'sports' | 'crypto' | 'politics' | 'other';
    status: 'active' | 'resolved' | 'expired';
    yesPrice: number;
    noPrice: number;
    totalVolume: number;
    expiresAt: number;
    createdAt: number;
    creator: string;
    isChronos: boolean;
}

export interface ListMarketsParams {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
    sortBy?: 'volume' | 'created' | 'expires';
}

export async function djinn_list_markets(
    params: ListMarketsParams = {}
): Promise<DjinnMarket[]> {
    const apiUrl = process.env.DJINN_API_URL || 'https://api.djinn.world';
    const queryParams = new URLSearchParams();

    if (params.category) queryParams.set('category', params.category);
    if (params.status) queryParams.set('status', params.status || 'active');
    if (params.limit) queryParams.set('limit', String(params.limit || 50));
    if (params.offset) queryParams.set('offset', String(params.offset || 0));
    if (params.sortBy) queryParams.set('sort', params.sortBy || 'volume');

    const response = await fetch(`${apiUrl}/api/markets?${queryParams}`);

    if (!response.ok) {
        throw new Error(`Djinn API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.markets as DjinnMarket[];
}

export default djinn_list_markets;
