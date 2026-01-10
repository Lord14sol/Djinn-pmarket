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
        console.error('Error fetching profile:', error);
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
        console.error('Error fetching comments:', error);
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
        console.error('Error fetching market data:', error);
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
        console.error('Error fetching activity:', error);
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
