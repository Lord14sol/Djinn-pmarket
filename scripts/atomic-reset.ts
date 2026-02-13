import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase environment variables in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const LORD_WALLET = "C31JQfZBVRsnvFqiNptD95rvbEx8fsuPwdZn62yEWx9X";

async function atomicReset() {
    console.log('☢️  STARTING ATOMIC DATABASE RESET...');
    console.log(`💎 Preserving wallet (Lord): ${LORD_WALLET}\n`);

    const tables = [
        'activity',
        'bets',
        'comments',
        'comment_likes',
        'notifications',
        'user_achievements',
        'follows'
    ];

    try {
        // 1. Wipe all trade/social tables completely
        for (const table of tables) {
            console.log(`--- Cleaning ${table} ---`);
            const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything
            if (error) console.error(`🔴 Error cleaning ${table}:`, error.message);
            else console.log(`✅ ${table} cleared.`);
        }

        // 2. Clear profiles (except Lord)
        console.log('--- Cleaning Profiles ---');
        const { error: profError } = await supabase
            .from('profiles')
            .delete()
            .neq('wallet_address', LORD_WALLET);

        if (profError) console.error('🔴 Error cleaning profiles:', profError.message);
        else console.log('✅ Profiles cleared (except Lord).');

        // 3. Reset Whitelist
        console.log('--- Cleaning Whitelist ---');
        const { error: whiteError } = await supabase
            .from('genesis_whitelist')
            .delete()
            .neq('wallet_address', LORD_WALLET);

        if (whiteError) console.error('🔴 Error cleaning whitelist:', whiteError.message);
        else console.log('✅ Whitelist cleared.');

        console.log('\n🚀 ATOMIC RESET COMPLETE!');
        console.log('Profiles, Activities, Bets, and Social metrics have been wiped.');
        console.log('Users (except Lord) must now re-claim their usernames.');
    } catch (err) {
        console.error('💥 CRITICAL ERROR during atomic reset:', err);
    }
}

atomicReset();
