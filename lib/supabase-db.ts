import { supabase } from './supabase';
import { withRetry } from './supabase-retry';

// ============================================
// PROFILES
// ============================================

export interface Profile {
    id?: string;
    wallet_address: string;
    username: string;
    bio: string;
    avatar_url: string | null;
    banner_url: string | null;
    created_at?: string;
    views?: number;
}

export async function getProfile(walletAddress: string): Promise<Profile | null> {
    return withRetry(async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('wallet_address', walletAddress)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        return data;
    }, `getProfile(${walletAddress})`);
}

export async function getProfileByUsername(username: string): Promise<Profile | null> {
    return withRetry(async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            // Case-insensitive search
            .ilike('username', username)
            .single();

        if (error && error.code !== 'PGRST116') {
            // If strictly not found, it's fine
            return null;
        }
        return data;
    }, `getProfileByUsername(${username})`);
}

export async function isUsernameAvailable(username: string, excludeWallet: string): Promise<boolean> {
    const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address')
        .ilike('username', username)
        .neq('wallet_address', excludeWallet)
        .maybeSingle();

    if (error) {
        console.error('Error checking username availability:', error);
        return false;
    }

    return !data;
}

export async function upsertProfile(profile: Partial<Profile> & { wallet_address: string }): Promise<Profile | null> {
    const walletAddress = profile.wallet_address;
    const toUpsert = {
        ...profile
    };
    // Only add defaults if it's potentially a new profile and fields are missing
    if (!toUpsert.username) toUpsert.username = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;
    if (!toUpsert.avatar_url) toUpsert.avatar_url = '/pink-pfp.png';
    if (!toUpsert.banner_url) toUpsert.banner_url = '/default-banner-v2.png';
    if (!toUpsert.bio) toUpsert.bio = 'New Djinn Trader';

    const { data, error } = await supabase
        .from('profiles')
        .upsert(toUpsert, { onConflict: 'wallet_address' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting profile:', error);
        return null;
    }
    return data;
}

export async function incrementProfileViews(walletAddress: string): Promise<number> {
    const { data: profile } = await supabase
        .from('profiles')
        .select('views')
        .eq('wallet_address', walletAddress)
        .single();

    const currentViews = (profile && typeof profile.views === 'number') ? profile.views : 0;
    const newViews = currentViews + 1;

    await supabase
        .from('profiles')
        .update({ views: newViews })
        .eq('wallet_address', walletAddress);

    return newViews;
}



// ============================================
// MARKET ACTIVITIES
// ============================================

export async function getMarketActivities(marketPubkey: string) {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select('*')
            .eq('market', marketPubkey)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching activities:', err);
        return [];
    }
}

// NEW: Global Activity Fetcher
export async function getGlobalActivities(limit = 50) {
    try {
        const { data, error } = await supabase
            .from('activities')
            .select(`
                *,
                markets (
                    title,
                    slug,
                    banner_url,
                    total_yes_pool,
                    total_no_pool
                )
            `)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data || [];
    } catch (err) {
        console.error('Error fetching global activities:', err);
        return [];
    }
}

// ============================================
// COMMENTS
// ============================================

export interface Comment {
    id?: string;
    market_slug: string;
    wallet_address: string;
    username: string;
    avatar_url: string | null;
    text: string;
    image_url: string | null;
    position: string | null;
    position_amount: string | null;
    likes_count: number;
    parent_id: string | null;
    created_at?: string;
    liked_by_me?: boolean;
    replies?: Comment[];
}

export async function getComments(marketSlug: string, currentWallet?: string): Promise<Comment[]> {
    // Get all comments for this market (top level only)
    const { data: comments, error } = await supabase
        .from('comments')
        .select('*')
        .eq('market_slug', marketSlug)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching comments:', JSON.stringify(error, null, 2));
        return [];
    }

    // Get replies for each comment
    const { data: replies } = await supabase
        .from('comments')
        .select('*')
        .eq('market_slug', marketSlug)
        .not('parent_id', 'is', null)
        .order('created_at', { ascending: true });

    // Get likes by current user
    let userLikes: string[] = [];
    if (currentWallet) {
        const { data: likes } = await supabase
            .from('comment_likes')
            .select('comment_id')
            .eq('wallet_address', currentWallet);
        userLikes = likes?.map(l => l.comment_id) || [];
    }

    // Combine comments with their replies and like status
    return comments?.map(c => ({
        ...c,
        liked_by_me: userLikes.includes(c.id),
        replies: replies?.filter(r => r.parent_id === c.id).map(r => ({
            ...r,
            liked_by_me: userLikes.includes(r.id)
        })) || []
    })) || [];
}

export async function createComment(comment: Omit<Comment, 'id' | 'created_at' | 'likes_count' | 'liked_by_me' | 'replies'>): Promise<{ data: Comment | null, error: any }> {
    const wallet = comment.wallet_address;
    const defaultData = {
        username: comment.username || `${wallet.slice(0, 4)}...${wallet.slice(-4)}`,
        avatar_url: comment.avatar_url || '/pink-pfp.png'
    };

    const toSave = {
        ...comment,
        ...defaultData,
        likes_count: 0
    };

    const { data, error } = await supabase
        .from('comments')
        .insert(toSave)
        .select()
        .single();

    if (error) {
        console.error('Error creating comment:', error);
        return { data: null, error };
    }

    // Achievement: COMMENTATOR (first comment)
    if (data) {
        grantAchievement(data.wallet_address, 'COMMENTATOR');
    }

    return { data, error: null };
}

export async function updateCommentPosition(walletAddress: string, marketSlug: string, position: string, positionAmount: string): Promise<boolean> {
    const { error } = await supabase
        .from('comments')
        .update({ position, position_amount: positionAmount })
        .eq('wallet_address', walletAddress)
        .eq('market_slug', marketSlug);

    if (error) {
        console.error('Error updating comment position:', error);
        return false;
    }
    return true;
}

export async function toggleLike(commentId: string, walletAddress: string): Promise<{ liked: boolean; newCount: number } | null> {
    // Check if already liked
    const { data: existing } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('wallet_address', walletAddress)
        .single();

    if (existing) {
        // Unlike
        await supabase.from('comment_likes').delete().eq('id', existing.id);
        await supabase.rpc('decrement_likes', { comment_id: commentId });
        const { data } = await supabase.from('comments').select('likes_count').eq('id', commentId).single();
        return { liked: false, newCount: data?.likes_count || 0 };
    } else {
        // Like
        await supabase.from('comment_likes').insert({ comment_id: commentId, wallet_address: walletAddress });
        await supabase.rpc('increment_likes', { comment_id: commentId });
        const { data } = await supabase.from('comments').select('likes_count').eq('id', commentId).single();
        return { liked: true, newCount: data?.likes_count || 0 };
    }
}

// ============================================
// MARKET DATA
// ============================================

export interface MarketData {
    slug: string;
    live_price: number;
    volume: number;
    updated_at?: string;
}

export async function getMarketData(slug: string): Promise<MarketData | null> {
    const { data, error } = await supabase
        .from('market_data')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching market data:', JSON.stringify(error, null, 2));
    }
    return data;
}

export async function getAllMarketData(): Promise<MarketData[]> {
    const { data, error } = await supabase
        .from('market_data')
        .select('*');

    if (error) {
        console.error('Error fetching all market data:', JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

export async function updateMarketPrice(slug: string, newPrice: number, addVolume: number): Promise<boolean> {
    // Try to update existing
    const { data: existing } = await supabase
        .from('market_data')
        .select('volume')
        .eq('slug', slug)
        .single();

    if (existing) {
        const { error } = await supabase
            .from('market_data')
            .update({
                live_price: newPrice,
                volume: existing.volume + addVolume,
                updated_at: new Date().toISOString()
            })
            .eq('slug', slug);
        return !error;
    } else {
        // Insert new
        const { error } = await supabase
            .from('market_data')
            .insert({ slug, live_price: newPrice, volume: addVolume });
        return !error;
    }
}

// ============================================
// ACTIVITY
// ============================================

export interface Activity {
    id?: string;
    wallet_address: string;
    username: string;
    avatar_url: string | null;
    action: string;
    amount: number; // USD Amount
    sol_amount?: number;
    shares: number;
    market_title: string;
    market_slug: string;
    market_icon?: string;
    outcome_name?: string;
    created_at?: string;
    order_type?: 'BUY' | 'SELL';
}

export async function getActivity(minAmount: number = 0, limit: number = 50, marketSlugs: string[] = []): Promise<Activity[]> {
    let query = supabase
        .from('activity')
        .select('*');

    if (marketSlugs.length > 0) {
        query = query.in('market_slug', marketSlugs);
    }

    // Apply order and limit after filtering
    query = query
        .order('created_at', { ascending: false })
        .limit(limit);

    if (minAmount > 0) {
        query = query.gte('amount', minAmount);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching activity:', JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

export async function getAllMarketActivity(slug: string): Promise<Activity[]> {
    const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('market_slug', slug)
        .order('created_at', { ascending: true }) // Important: Oldest first for replay
        .limit(2000); // Fetch sizeable history for chart

    if (error) {
        console.error('Error fetching all activity:', error);
        return [];
    }
    return data || [];
}

export async function createActivity(activity: Omit<Activity, 'id' | 'created_at'>): Promise<{ data: Activity | null, error: any }> {
    const { data, error } = await supabase
        .from('activity')
        .insert(activity)
        .select()
        .single();

    if (error) {
        console.error('Error creating activity:', error);
        return { data: null, error };
    }
    return { data, error: null };
}

export async function getUserActivity(walletAddress: string): Promise<Activity[]> {
    const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) {
        console.error('Error fetching user activity:', error);
        return [];
    }
    return data || [];
}

// --- HOLDERS (Derived from Bets) ---
export interface Holder {
    rank: number;
    name: string;
    avatar: string | null;
    positions: Record<string, number>; // Dynamic: { "YES": 10, "Argentina": 50 }
    totalShares: number;
    wallet_address: string;
}

export async function getTopHolders(slug: string): Promise<Holder[]> {
    // Read from bets table - only active (unclaimed) positions
    const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('market_slug', slug)
        .eq('claimed', false);

    if (error || !data) return [];

    // Aggregate shares by wallet
    const agg: Record<string, Holder> = {};
    const wallets: string[] = [];

    data.forEach(bet => {
        const key = bet.wallet_address;
        if (!agg[key]) {
            agg[key] = {
                rank: 0,
                name: bet.wallet_address.slice(0, 6) + '...',
                avatar: null,
                positions: {},
                totalShares: 0,
                wallet_address: bet.wallet_address
            };
            wallets.push(bet.wallet_address);
        }

        const shares = Number(bet.shares || 0);
        const side = bet.side; // Dynamic side string

        if (!agg[key].positions[side]) {
            agg[key].positions[side] = 0;
        }
        agg[key].positions[side] += shares;
        agg[key].totalShares += shares;
    });

    // Fetch profiles for these wallets
    if (wallets.length > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('wallet_address, username, avatar_url')
            .in('wallet_address', wallets);

        profiles?.forEach(p => {
            if (agg[p.wallet_address]) {
                if (p.username) agg[p.wallet_address].name = p.username;
                if (p.avatar_url) agg[p.wallet_address].avatar = p.avatar_url;
            }
        });
    }

    // Sort by TOTAL shares descending and assign ranks
    const sorted = Object.values(agg)
        .filter(h => h.totalShares > 0.001)
        .sort((a, b) => b.totalShares - a.totalShares);

    return sorted.map((h, i) => ({ ...h, rank: i + 1 }));
}

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export function subscribeToComments(marketSlug: string, callback: (payload: any) => void) {
    return supabase
        .channel(`comments:${marketSlug}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'comments',
            filter: `market_slug=eq.${marketSlug}`
        }, callback)
        .subscribe();
}

export function subscribeToActivity(marketSlug: string, callback: (payload: any) => void) {
    return supabase
        .channel(`activity:${marketSlug}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'activity',
            filter: `market_slug=eq.${marketSlug}` // ✅ FIX: Only receive events for this market
        }, callback)
        .subscribe();
}

export function subscribeToMarketData(slug: string, callback: (payload: any) => void) {
    return supabase
        .channel(`market:${slug}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'market_data',
            filter: `slug=eq.${slug}`
        }, callback)
        .subscribe();
}

export function subscribeToAllMarketData(callback: (payload: any) => void) {
    return supabase
        .channel('all-market-data')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'market_data'
        }, callback)
        .subscribe();
}

export function subscribeToMarkets(callback: (payload: any) => void) {
    return supabase
        .channel('markets:public')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'markets'
        }, callback)
        .subscribe();
}

// ============================================
// MARKETS (Resolution System)
// ============================================

export interface Market {
    id?: string;
    slug: string;
    title: string;
    description?: string;
    banner_url?: string;
    creator_wallet: string;
    end_date?: string;
    resolved: boolean;
    winning_outcome?: 'YES' | 'NO' | null;
    total_yes_pool: number;
    total_no_pool: number;
    resolution_date?: string;
    created_at?: string;
    // Blockchain fields
    market_pda?: string;
    yes_token_mint?: string;
    no_token_mint?: string;
    tx_signature?: string;
    resolution_source?: string;
    // Multi-outcome support
    options?: string[]; // Array of outcome names (e.g., ["Yes", "No"] or ["Brasil", "Argentina", "Chile"])
    creator_username?: string;
    creator_avatar?: string;
}

export async function createMarket(market: Partial<Market> & {
    slug: string;
    title: string;
    creator_wallet: string;
    category: string; // REQUIRED - auto-detected from title
}) {
    // Valid categories (including 'Trending' as fallback)
    const validCategories = ['Trending', 'Crypto', 'Politics', 'Sports', 'Earth', 'Movies',
        'Culture', 'Tech', 'AI', 'Science', 'Finance', 'Gaming'];

    if (!market.category || !validCategories.includes(market.category)) {
        throw new Error('Invalid or missing category. Must be one of: ' + validCategories.join(', '));
    }

    return withRetry(async () => {
        const { data, error } = await supabase
            .from('markets')
            .upsert(market, { onConflict: 'slug' })
            .select()
            .single();

        if (error) throw error;
        return { data, error: null };
    }, 'createMarket');
}

export async function getMarkets(): Promise<Market[]> {
    return withRetry(async () => {
        const { data, error } = await supabase
            .from('markets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    }, 'getMarkets');
}

export async function getMarket(slug: string): Promise<Market | null> {
    return withRetry(async () => {
        // 1. Fetch Market
        const { data: market, error } = await supabase
            .from('markets')
            .select('*')
            .eq('slug', slug)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        if (market) {
            // 2. Manual Fetch for Creator Profile (More robust than JOIN if FKs likely missing)
            if (market.creator_wallet) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('username, avatar_url')
                    .eq('wallet_address', market.creator_wallet)
                    .single();

                if (profile) {
                    return {
                        ...market,
                        creator_username: profile.username,
                        creator_avatar: profile.avatar_url
                    };
                }
            }
            return market;
        }
        return null;
    }, `getMarket(${slug})`);
}

export async function updateMarket(slug: string, updates: Partial<Market>) {
    try {
        const { data, error } = await supabase
            .from('markets')
            .update(updates)
            .eq('slug', slug)
            .select()
            .single();

        if (error) throw error;
        return { data };
    } catch (e: any) {
        console.error('Error updating market:', e);
        return { error: e.message };
    }
}

export async function resolveMarket(slug: string, winningOutcome: 'YES' | 'NO' | 'VOID') {
    // 1. Update market as resolved
    const { error: marketError } = await supabase
        .from('markets')
        .update({
            resolved: true,
            winning_outcome: winningOutcome,
            resolution_date: new Date().toISOString()
        })
        .eq('slug', slug);

    if (marketError) {
        console.error('Error resolving market:', marketError);
        return { error: marketError };
    }

    // 2. Get all bets for this market
    const { data: bets, error: betsError } = await supabase
        .from('bets')
        .select('*')
        .eq('market_slug', slug);

    if (betsError || !bets) {
        console.error('Error fetching bets:', betsError);
        return { error: betsError };
    }

    // 3. Calculate payouts
    const winningBets = bets.filter(b => b.side === winningOutcome);
    const losingBets = bets.filter(b => b.side !== winningOutcome);

    const totalWinningPool = winningBets.reduce((sum, b) => sum + parseFloat(b.sol_amount), 0);
    const totalLosingPool = losingBets.reduce((sum, b) => sum + parseFloat(b.sol_amount), 0);
    const totalPool = totalWinningPool + totalLosingPool;

    // 4. Calculate each winner's share
    for (const bet of winningBets) {
        const betAmount = parseFloat(bet.sol_amount);
        const shareOfWinnings = totalWinningPool > 0 ? (betAmount / totalWinningPool) : 0;
        const payout = betAmount + (shareOfWinnings * totalLosingPool); // Original + winnings

        await supabase
            .from('bets')
            .update({ payout })
            .eq('id', bet.id);

        // Check win milestones (FIRST_WIN, WIN_3, WIN_STREAK_3, etc.)
        await checkWinMilestones(bet.wallet_address);
    }

    // 5. Set losing bets payout to 0
    for (const bet of losingBets) {
        await supabase
            .from('bets')
            .update({ payout: 0 })
            .eq('id', bet.id);
    }

    return {
        success: true,
        totalPool,
        winningBets: winningBets.length,
        losingBets: losingBets.length
    };
}

// ============================================
// BETS
// ============================================

export interface Bet {
    id?: string;
    market_slug: string;
    wallet_address: string;
    side: string; // Dynamic side string
    amount: number;
    sol_amount: number;
    shares: number;
    entry_price: number;
    payout?: number;
    claimed: boolean;
    created_at?: string;
}

export async function createBet(bet: Omit<Bet, 'id' | 'payout' | 'claimed' | 'created_at'>) {
    // 1. Check if ANY active bets exist (could be multiple due to bugs)
    const { data: existingBets, error: fetchError } = await supabase
        .from('bets')
        .select('*')
        .eq('wallet_address', bet.wallet_address)
        .eq('market_slug', bet.market_slug)
        .eq('side', bet.side)
        .eq('claimed', false);

    if (fetchError) {
        console.error('Error checking existing bet:', fetchError);
    }

    // 2. If exists, UPDATE the FIRST one (or merge? simplest is update first, ignore others for now, reduceBetPosition cleans them)
    if (existingBets && existingBets.length > 0) {
        const existingBet = existingBets[0]; // Pick first

        const newAmount = Number(existingBet.amount) + Number(bet.amount);
        const newSolAmount = Number(existingBet.sol_amount) + Number(bet.sol_amount);
        const newShares = Number(existingBet.shares) + Number(bet.shares);

        // Weighted Avg Entry Price
        const weightedPrice = ((Number(existingBet.shares) * Number(existingBet.entry_price)) + (Number(bet.shares) * Number(bet.entry_price))) / newShares;

        const { data, error } = await supabase
            .from('bets')
            .update({
                amount: newAmount,
                sol_amount: newSolAmount,
                shares: newShares,
                entry_price: weightedPrice
            })
            .eq('id', existingBet.id)
            .select()
            .single();

        if (error) console.error('Error updating bet:', error);

        // Check milestone on the AGGREGATED amount
        if (data) await checkBetMilestones(data.wallet_address, data.amount);

        return { data, error };
    }

    // 3. If NOT exists, INSERT new
    else {
        const { data, error } = await supabase
            .from('bets')
            .insert({
                ...bet,
                claimed: false
            })
            .select()
            .single();

        if (error) console.error('Error creating bet:', error);

        if (data) {
            await checkBetMilestones(data.wallet_address, data.amount);
        }

        return { data, error };
    }
}

export async function reduceBetPosition(wallet: string, marketSlug: string, side: string, sharesToRemove: number) {
    // 1. Get ALL active bets (handling potential duplicates)
    const { data: existingBets, error: fetchError } = await supabase
        .from('bets')
        .select('*')
        .eq('wallet_address', wallet)
        .eq('market_slug', marketSlug)
        .eq('side', side)
        .eq('claimed', false)
        .gt('created_at', '2026-01-30T15:45:00.000Z') // SYSTEM RESET TIMESTAMP
        .order('created_at', { ascending: true }); // FIFO

    if (fetchError || !existingBets || existingBets.length === 0) {
        console.error("Error finding bet to sell:", fetchError);
        return { error: fetchError || "Bet not found" };
    }

    let remainingToRemove = sharesToRemove;

    // 2. Iterate and reduce/delete
    const idsToDelete: string[] = [];
    let updateTarget: { id: string, payload: any } | null = null;

    for (const bet of existingBets) {
        if (remainingToRemove <= 0) break;

        const currentShares = Number(bet.shares);

        if (currentShares <= remainingToRemove + 0.000001) {
            // Mark for deletion
            remainingToRemove -= currentShares;
            idsToDelete.push(bet.id!); // Non-null assertion if interface allows
        } else {
            // Partial sell of this row
            const newShares = currentShares - remainingToRemove;

            // Linear reduction of amounts
            const ratio = currentShares > 0 ? (newShares / currentShares) : 0;
            const newAmount = bet.amount * ratio;
            const newSolAmount = bet.sol_amount * ratio;

            updateTarget = {
                id: bet.id!,
                payload: {
                    shares: newShares,
                    amount: newAmount,
                    sol_amount: newSolAmount
                }
            };
            remainingToRemove = 0;
        }
    }

    // 3. Execute Batch Operations
    const promises = [];

    if (idsToDelete.length > 0) {
        promises.push(supabase.from('bets').delete().in('id', idsToDelete));
    }

    if (updateTarget) {
        promises.push(supabase
            .from('bets')
            .update(updateTarget.payload)
            .eq('id', updateTarget.id)
        );
    }

    await Promise.all(promises);

    return { success: true };
}

export async function getUserBets(walletAddress: string): Promise<Bet[]> {
    const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('wallet_address', walletAddress)
        .gt('created_at', '2026-01-30T15:45:00.000Z') // SYSTEM RESET TIMESTAMP
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user bets:', typeof error === 'object' ? JSON.stringify(error, null, 2) : error);
    }
    return data || [];
}

export async function getUserMarketBets(walletAddress: string, marketSlug: string): Promise<Bet[]> {
    const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('market_slug', marketSlug)
        .eq('claimed', false);

    if (error) {
        console.error('Error fetching user market bets:', error);
    }
    return data || [];
}

export async function getUnclaimedPayouts(walletAddress: string): Promise<Bet[]> {
    const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('claimed', false)
        .not('payout', 'is', null)
        .gt('created_at', '2026-01-30T15:45:00.000Z') // SYSTEM RESET
        .gt('payout', 0);

    if (error) console.error('Error fetching unclaimed payouts:', error);
    return data || [];
}

export async function claimPayout(betId: string) {
    const { error } = await supabase
        .from('bets')
        .update({ claimed: true })
        .eq('id', betId);

    if (error) console.error('Error claiming payout:', error);
    return { error };
}

// Cancel/Refund a bet - marks as claimed so it disappears from active bets
export async function cancelBet(walletAddress: string, marketSlug: string) {
    const { error } = await supabase
        .from('bets')
        .update({ claimed: true, payout: 0 })
        .eq('wallet_address', walletAddress)
        .eq('market_slug', marketSlug)
        .eq('claimed', false);

    if (error) console.error('Error canceling bet:', error);
    return { error };
}

// ============================================
// ACHIEVEMENTS
// ============================================

export interface Achievement {
    code: string;
    name: string;
    description: string;
    image_url: string;
    xp: number;
    earned_at?: string;
}

export async function getAchievements(): Promise<Achievement[]> {
    const { data, error } = await supabase
        .from('achievements')
        .select('*');
    if (error) {
        console.error('Error fetching achievements:', JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

export async function getUserAchievements(walletAddress: string): Promise<Achievement[]> {
    // Join achievements with user_achievements
    const { data, error } = await supabase
        .from('user_achievements')
        .select(`
            earned_at,
            achievement:achievements (
                code, name, description, image_url, xp
            )
        `)
        .eq('user_wallet', walletAddress);

    if (error) {
        console.error('Error fetching user achievements:', JSON.stringify(error, null, 2));
        return [];
    }

    // Transform nested result if necessary, or return as is (client handles nesting)
    // Supabase returns { earned_at, achievement: { ... } }
    return data.map((item: any) => ({
        ...item.achievement,
        earned_at: item.earned_at
    }));
}

export async function grantAchievement(walletAddress: string, code: string): Promise<Achievement | null> {
    // 1. Check if achievement exists
    const { data: achievement } = await supabase
        .from('achievements')
        .select('*')
        .eq('code', code)
        .single();

    if (!achievement) return null;

    // 2. Try to insert (ignore if already exists due to unique constraint)
    const { error } = await supabase
        .from('user_achievements')
        .insert({
            user_wallet: walletAddress,
            achievement_code: code
        });

    if (error) {
        // If unique violation (code 23505), user already has it
        if (error.code === '23505') return null;
        console.error('Error granting achievement:', JSON.stringify(error, null, 2));
        return null;
    }

    return achievement;
}

// ============================================
// ACHIEVEMENT MILESTONE CHECKS
// ============================================

/**
 * Check and grant market creation milestones
 * Call this after a user creates a market
 */
export async function checkMarketMilestones(walletAddress: string): Promise<Achievement[]> {
    const granted: Achievement[] = [];

    // Count user's markets
    const { count } = await supabase
        .from('markets')
        .select('*', { count: 'exact', head: true })
        .eq('creator_wallet', walletAddress);

    const marketCount = count || 0;

    // Check milestones
    if (marketCount >= 1) {
        const ach = await grantAchievement(walletAddress, 'FIRST_MARKET');
        if (ach) granted.push(ach);
    }
    if (marketCount >= 5) {
        const ach = await grantAchievement(walletAddress, 'MARKET_5');
        if (ach) granted.push(ach);
    }
    if (marketCount >= 10) {
        const ach = await grantAchievement(walletAddress, 'MARKET_10');
        if (ach) granted.push(ach);
    }
    if (marketCount >= 25) {
        const ach = await grantAchievement(walletAddress, 'MARKET_25');
        if (ach) granted.push(ach);
    }

    return granted;
}

/**
 * Check and grant win milestones
 * Call this after a user wins a bet
 */
export async function checkWinMilestones(walletAddress: string): Promise<Achievement[]> {
    const granted: Achievement[] = [];

    // Count user's wins (bets with payout > 0)
    const { data: wins } = await supabase
        .from('bets')
        .select('id, created_at')
        .eq('wallet_address', walletAddress)
        .gt('payout', 0)
        .order('created_at', { ascending: false });

    const winCount = wins?.length || 0;

    // Check total win milestones
    if (winCount >= 1) {
        const ach = await grantAchievement(walletAddress, 'FIRST_WIN');
        if (ach) granted.push(ach);
    }
    if (winCount >= 3) {
        const ach = await grantAchievement(walletAddress, 'WIN_3');
        if (ach) granted.push(ach);
    }

    // Check win streaks (consecutive wins)
    if (wins && wins.length >= 3) {
        // Get last 5 bets to check for streak
        const { data: recentBets } = await supabase
            .from('bets')
            .select('payout')
            .eq('wallet_address', walletAddress)
            .eq('claimed', true) // 'payout_claimed' logic might be different but let's assume filtering applies to bet creation
            .gt('created_at', '2026-01-30T15:45:00.000Z') // SYSTEM RESET TIMESTAMP
            .not('payout', 'is', null)
            .order('created_at', { ascending: false })
            .limit(5);

        if (recentBets) {
            let streak = 0;
            for (const bet of recentBets) {
                if (bet.payout > 0) streak++;
                else break; // Streak broken
            }

            if (streak >= 3) {
                const ach = await grantAchievement(walletAddress, 'WIN_STREAK_3');
                if (ach) granted.push(ach);
            }
            if (streak >= 5) {
                const ach = await grantAchievement(walletAddress, 'WIN_STREAK_5');
                if (ach) granted.push(ach);
            }
        }
    }

    return granted;
}

/**
 * Check and grant bet milestones
 * Call this after a user places a bet
 */
export async function checkBetMilestones(walletAddress: string, betAmount: number): Promise<Achievement[]> {
    const granted: Achievement[] = [];

    // Count user's bets
    const { count } = await supabase
        .from('bets')
        .select('*', { count: 'exact', head: true })
        .eq('wallet_address', walletAddress);

    const betCount = count || 0;

    // First bet
    if (betCount >= 1) {
        const ach = await grantAchievement(walletAddress, 'FIRST_BET');
        if (ach) granted.push(ach);
    }

    // Whale check
    if (betAmount >= 1000) {
        const ach = await grantAchievement(walletAddress, 'WHALE');
        if (ach) granted.push(ach);
    }

    return granted;
}


// ============================================
// SEARCH
// ============================================

export async function searchMarkets(query: string) {
    // Search in markets table by title (primary) and slug
    const { data, error } = await supabase
        .from('markets')
        .select('id, title, slug, banner_url, category, created_at, resolved')
        .or(`title.ilike.%${query}%,slug.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(8);

    if (error) console.error('Error searching markets:', error);
    return data || [];
}

export async function searchProfiles(query: string) {
    const { data, error } = await supabase
        .from('profiles')
        .select('wallet_address, username, avatar_url, bio')
        .or(`username.ilike.%${query}%,wallet_address.ilike.%${query}%`)
        .limit(8);

    if (error) console.error('Error searching profiles:', error);
    return data || [];
}

// ============================================
// FOLLOW SYSTEM
// ============================================

export async function followUser(followerWallet: string, followingWallet: string): Promise<boolean> {
    const { error } = await supabase
        .from('follows')
        .insert({ follower_wallet: followerWallet, following_wallet: followingWallet });

    if (error) {
        if (error.code === '23505') return true; // Already following
        console.error('Error following user:', error);
        return false;
    }
    return true;
}

export async function unfollowUser(followerWallet: string, followingWallet: string): Promise<boolean> {
    const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_wallet', followerWallet)
        .eq('following_wallet', followingWallet);

    if (error) {
        console.error('Error unfollowing user:', error);
        return false;
    }
    return true;
}

export async function isFollowing(followerWallet: string, followingWallet: string): Promise<boolean> {
    if (!followerWallet || !followingWallet) return false;
    const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_wallet', followerWallet)
        .eq('following_wallet', followingWallet)
        .single();

    return !!data;
}

export async function getFollowCounts(walletAddress: string): Promise<{ followers: number, following: number }> {
    const [followersRes, followingRes] = await Promise.all([
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_wallet', walletAddress),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_wallet', walletAddress)
    ]);

    return {
        followers: followersRes.count || 0,
        following: followingRes.count || 0
    };
}
