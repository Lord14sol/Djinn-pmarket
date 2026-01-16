import { supabase } from './supabase';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export async function withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
): Promise<T> {
    let lastError: Error | null = null;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            if (i > 0) console.log(`[Supabase] Retry attempt ${i + 1}/${MAX_RETRIES}: ${operationName}`);
            return await operation();
        } catch (err: any) {
            lastError = err;
            const isConnectionError = err.message?.includes('fetch') || err.message?.includes('network');

            console.warn(`[Supabase] Attempt ${i + 1} failed (${operationName}):`, err.message);

            // Only wait if we are going to retry
            if (i < MAX_RETRIES - 1) {
                // Fast fail if not a network error? No, let's retry anyway just in case it's a transient DB error
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)));
            }
        }
    }

    throw new Error(`${operationName} failed after ${MAX_RETRIES} attempts: ${lastError?.message}`);
}
