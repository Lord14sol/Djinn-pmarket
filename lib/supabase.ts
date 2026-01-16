import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const isBuildPhase = typeof window === 'undefined' && (!supabaseUrl || !supabaseAnonKey);

if (isBuildPhase) {
    console.warn("⚠️ Building without Supabase keys. Using mock client to prevent crash.");
}

if (typeof window !== 'undefined') {
    console.log('🔌 Supabase Initialization (Client):', {
        url: supabaseUrl ? 'PRESENT' : 'MISSING ❌',
        key: supabaseAnonKey ? 'PRESENT' : 'MISSING ❌',
        rawUrl: supabaseUrl // This will help debug if it's an invalid URL
    });
}

// If missing keys (e.g. build time), provide a dummy URL to satisfy createClient
// This prevents "Error: supabaseUrl is required" during 'npm run build'
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key'
);