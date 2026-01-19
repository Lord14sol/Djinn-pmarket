/**
 * DJINN MARKET CLEANUP SCRIPT
 * Run with: npx ts-node scripts/cleanup-markets.ts
 * Or: bun run scripts/cleanup-markets.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE env vars. Run with:');
    console.error('NEXT_PUBLIC_SUPABASE_URL=xxx NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx npx ts-node scripts/cleanup-markets.ts');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    console.log('🧹 Starting Djinn Market Cleanup...\n');

    const tables = [
        'comment_likes',
        'comments',
        'activity',
        'bets',
        'market_data',
        'markets'
    ];

    for (const table of tables) {
        try {
            const { error, count } = await supabase
                .from(table)
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (workaround)

            if (error) {
                // Try alternative delete
                const { error: err2 } = await supabase.from(table).delete().gte('created_at', '1970-01-01');
                if (err2) {
                    console.log(`❌ ${table}: ${err2.message}`);
                } else {
                    console.log(`✅ ${table}: Cleared`);
                }
            } else {
                console.log(`✅ ${table}: Cleared`);
            }
        } catch (e: any) {
            console.log(`❌ ${table}: ${e.message}`);
        }
    }

    console.log('\n✨ Cleanup complete! Ready for fresh markets.');
}

cleanup();
