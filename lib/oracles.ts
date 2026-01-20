
export interface TokenData {
    priceUsd: string;
    priceChange: {
        h1: number;
        h6: number;
        h24: number;
    };
    liquidity: {
        usd: number;
    };
    fdv: number;
    pairAddress: string;
    url: string;
}

export async function getTokenData(query: string): Promise<TokenData | null> {
    try {
        // Try searching by address or name
        const res = await fetch(`https://api.dexscreener.com/latest/dex/search?q=${query}`);
        const data = await res.json();

        if (data.pairs && data.pairs.length > 0) {
            // Return the most liquid pair
            const bestPair = data.pairs.sort((a: any, b: any) => b.liquidity.usd - a.liquidity.usd)[0];

            return {
                priceUsd: bestPair.priceUsd,
                priceChange: bestPair.priceChange,
                liquidity: bestPair.liquidity,
                fdv: bestPair.fdv,
                pairAddress: bestPair.pairAddress,
                url: bestPair.url
            };
        }
        return null;
    } catch (e) {
        console.error("Error fetching DexScreener data:", e);
        return null;
    }
}
