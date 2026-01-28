
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load env vars from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
    const targetSlug = 'quien-para-president-mky9dpj9';
    console.log(`🧹 Cleaning up markets... Target to keep: ${targetSlug}`);

    try {
        // 1. Find all markets to delete
        const { data: markets, error: marketError } = await supabase
            .from('markets')
            .select('slug')
            .neq('slug', targetSlug);

        if (marketError) throw marketError;

        const slugsToDelete = markets?.map(m => m.slug) || [];
        console.log(`📍 Found ${slugsToDelete.length} markets to delete.`);

        if (slugsToDelete.length > 0) {
            // 2. Delete market data
            const { error: dataError } = await supabase
                .from('market_data')
                .delete()
                .in('slug', slugsToDelete);
            if (dataError) console.warn("Error deleting market_data:", dataError.message);

            // 3. Delete activity
            const { error: activityError } = await supabase
                .from('activity')
                .delete()
                .in('market_slug', slugsToDelete);
            if (activityError) console.warn("Error deleting activity:", activityError.message);

            // 4. Delete bets
            const { error: betsError } = await supabase
                .from('bets')
                .delete()
                .in('market_slug', slugsToDelete);
            if (betsError) console.warn("Error deleting bets:", betsError.message);

            // 5. Finally delete the markets
            const { error: finalError } = await supabase
                .from('markets')
                .delete()
                .in('slug', slugsToDelete);
            if (finalError) throw finalError;
        }

        console.log("✅ Cleanup complete. Only the latest market remains.");
    } catch (err) {
        console.error("❌ Cleanup failed:", err);
    }
}

cleanup();
