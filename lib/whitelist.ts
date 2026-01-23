import { supabase } from './supabase';

export const ADMIN_WALLETS = [
    "C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X",
    "G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma"
];

// USER REQUEST: Limit to 2 for local testing, 100 for production.
export const GENESIS_LIMIT = process.env.NODE_ENV === 'development' ? 2 : 100;

export interface WhitelistStatus {
    count: number;
    isFull: boolean;
    isRegistered: boolean;
    isAdmin: boolean;
}

/**
 * Checks the current status of the whitelist for a given wallet address.
 */
export async function getWhitelistStatus(walletAddress?: string): Promise<WhitelistStatus> {
    const isAdmin = walletAddress ? ADMIN_WALLETS.includes(walletAddress) : false;

    // Get current count
    const { count, error: countError } = await supabase
        .from('genesis_whitelist')
        .select('*', { count: 'exact', head: true });

    if (countError) {
        console.error('[Whitelist] Error fetching count:', countError);
    }

    const currentCount = count || 0;

    // Check if user is already registered
    let isRegistered = false;
    if (walletAddress) {
        const { data, error: regError } = await supabase
            .from('genesis_whitelist')
            .select('wallet_address')
            .eq('wallet_address', walletAddress)
            .single();

        if (data) isRegistered = true;
    }

    return {
        count: currentCount,
        isFull: currentCount >= GENESIS_LIMIT,
        isRegistered,
        isAdmin
    };
}

/**
 * Registers a wallet for the Genesis whitelist.
 */
export async function registerForWhitelist(walletAddress: string): Promise<{ success: boolean; message: string }> {
    const status = await getWhitelistStatus(walletAddress);

    if (status.isAdmin) {
        return { success: true, message: "WELCOME BACK, ARCHITECT" };
    }

    if (status.isRegistered) {
        return { success: true, message: "WELCOME BACK, GENESIS USER" };
    }

    if (status.isFull) {
        return { success: false, message: "SPOTS FULL. THANK YOU FOR YOUR INTEREST" };
    }

    const { error } = await supabase
        .from('genesis_whitelist')
        .insert([{ wallet_address: walletAddress }]); // Schema updated to only wallet_address

    if (error) {
        console.error('[Whitelist] Registration error:', error);
        return { success: false, message: "ERROR CLAIMING SPOT. TRY AGAIN." };
    }

    return { success: true, message: "GENESIS SPOT SECURED. WELCOME TO DJINN." };
}
