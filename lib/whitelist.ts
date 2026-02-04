import { supabase } from './supabase';

export const ADMIN_WALLETS = [
    "C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X",
    "G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma",
    "6Jg8mGGywg758CDvywz8QnshCJNvBJzXvYWdYZ4YNznH"
];

// Límite de Genesis: Solo los primeros 1000 usuarios reciben la medalla
export const GENESIS_LIMIT = 1000;

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
    let currentCount = 0;
    try {
        const { count, error: countError } = await supabase
            .from('genesis_whitelist')
            .select('*', { count: 'exact', head: true });

        if (countError) {
            console.warn('[Whitelist] Supabase Count Error (using fallback):', countError.message);
        } else {
            currentCount = count || 0;
        }
    } catch (e) {
        console.warn('[Whitelist] Supabase Exception (using fallback):', e);
    }

    // Check if user is already registered (fallback: ALLOW IF ERROR)
    // If we can't check the whitelist, we assume the user is allowed in for Devnet/Test purposes
    // rather than locking them out.
    let isRegistered = false;

    if (walletAddress) {
        try {
            const { data, error: regError } = await supabase
                .from('genesis_whitelist')
                .select('wallet_address')
                .eq('wallet_address', walletAddress)
                .single();

            if (data) {
                isRegistered = true;
            } else if (regError && regError.code === 'PGRST116') {
                // Not found, correct behavior
                isRegistered = false;
            } else if (regError) {
                console.warn('[Whitelist] Supabase Check Error (Using Fallback True):', regError.message);
                // FAIL SAFE: Allow entry if DB is broken
                isRegistered = true;
            }
        } catch (e) {
            console.warn('[Whitelist] Exception (Using Fallback True):', e);
            isRegistered = true;
        }
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
        return { success: false, message: "SPOTS FULL. THANK YOU STAY TUNED FOR UPDATES" };
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
