import { supabase } from './supabase';

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
}

export async function getProfile(walletAddress: string): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching profile:', JSON.stringify(error, null, 2));
    }
    return data;
}

export async function upsertProfile(profile: Partial<Profile> & { wallet_address: string }): Promise<Profile | null> {
    const { data, error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'wallet_address' })
        .select()
        .single();

    if (error) {
        console.error('Error upserting profile:', error);
        return null;
    }
    return data;
}

export async function searchProfiles(query: string, limit: number = 10): Promise<Profile[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .limit(limit);

    if (error) {
        console.error('Error searching profiles:', error);
        return [];
    }
    return data || [];
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
    position: 'YES' | 'NO' | null;
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
    const { data, error } = await supabase
        .from('comments')
        .insert({ ...comment, likes_count: 0 })
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

export async function updateCommentPosition(walletAddress: string, marketSlug: string, position: 'YES' | 'NO', positionAmount: string): Promise<boolean> {
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
    action: 'YES' | 'NO';
    amount: number; // USD Amount
    sol_amount?: number;
    shares: number;
    market_title: string;
    market_slug: string;
    created_at?: string;
}

export async function getActivity(minAmount: number = 0, limit: number = 50): Promise<Activity[]> {
    let query = supabase
        .from('activity')
        .select('*')
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

// --- HOLDERS (Derived from Activity) ---
export interface Holder {
    rank: number;
    name: string;
    avatar: string | null;
    shares: number;
    wallet_address: string;
}

export async function getTopHolders(slug: string): Promise<Holder[]> {
    // In a real production app, we would use a dedicated 'positions' table updated via triggers.
    // For this prototype, we calculate holdings by summing up 'activity' shares for the market.
    const { data, error } = await supabase
        .from('activity')
        .select('*')
        .eq('market_slug', slug);

    if (error || !data) return [];

    const agg: Record<string, Holder> = {};

    data.forEach(act => {
        if (!agg[act.wallet_address]) {
            agg[act.wallet_address] = {
                rank: 0,
                name: act.username,
                avatar: act.avatar_url,
                shares: 0,
                wallet_address: act.wallet_address
            };
        }
        // Simple accumulation logic
        agg[act.wallet_address].shares += act.shares || 0;
    });

    const sorted = Object.values(agg).sort((a, b) => b.shares - a.shares);
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

export function subscribeToActivity(callback: (payload: any) => void) {
    return supabase
        .channel('activity')
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'activity'
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
}

export async function createMarket(market: Partial<Market> & { slug: string; title: string; creator_wallet: string }) {
    const { data, error } = await supabase
        .from('markets')
        .upsert(market, { onConflict: 'slug' })
        .select()
        .single();

    if (error) console.error('Error creating market:', error);
    return { data, error };
}

export async function getMarkets(): Promise<Market[]> {
    const { data, error } = await supabase
        .from('markets')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching markets:', error);
    return data || [];
}

export async function getMarket(slug: string): Promise<Market | null> {
    const { data, error } = await supabase
        .from('markets')
        .select('*')
        .eq('slug', slug)
        .single();

    if (error && error.code !== 'PGRST116') console.error('Error fetching market:', error);
    return data;
}

export async function resolveMarket(slug: string, winningOutcome: 'YES' | 'NO') {
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
    side: 'YES' | 'NO';
    amount: number;
    sol_amount: number;
    shares: number;
    entry_price: number;
    payout?: number;
    claimed: boolean;
    created_at?: string;
}

export async function createBet(bet: Omit<Bet, 'id' | 'payout' | 'claimed' | 'created_at'>) {
    const { data, error } = await supabase
        .from('bets')
        .insert({
            ...bet,
            claimed: false
        })
        .select()
        .single();

    if (error) console.error('Error creating bet:', error);

    // Check bet milestones (FIRST_BET, WHALE)
    if (data) {
        await checkBetMilestones(data.wallet_address, data.amount);
    }

    return { data, error };
}

export async function getUserBets(walletAddress: string): Promise<Bet[]> {
    const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching user bets:', error);
    return data || [];
}

export async function getUnclaimedPayouts(walletAddress: string): Promise<Bet[]> {
    const { data, error } = await supabase
        .from('bets')
        .select('*')
        .eq('wallet_address', walletAddress)
        .eq('claimed', false)
        .not('payout', 'is', null)
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

