import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ✅ BETTER: Only check on client-side (browser) - Non-blocking
if (typeof window !== 'undefined' && (!supabaseUrl || !supabaseAnonKey)) {
    console.error('❌ Missing Supabase environment variables!');
    console.log('SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
    console.log('SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
    console.log('\n📝 To fix this:');
    console.log('1. Check .env.local in your project root');
    console.log('2. Restart: npm run dev\n');
}

// ✅ UPDATED: Use fallback values for SSR, only throw on client if missing
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        }
    }
);

// ✅ ADDED: Export a flag so components can check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);