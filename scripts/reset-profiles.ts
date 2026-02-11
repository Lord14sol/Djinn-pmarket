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

async function resetProfiles() {
    console.log('🚀 Starting Profile Reset...');
    console.log(`💎 Preserving wallet: ${LORD_WALLET}`);

    try {
        // 1. Delete from profiles
        console.log('--- Cleaning Profiles ---');
        const { data: profData, error: profError } = await supabase
            .from('profiles')
            .delete()
            .neq('wallet_address', LORD_WALLET);

        if (profError) {
            console.error('🔴 Error deleting profiles:', profError.message);
        } else {
            console.log('✅ Profiles cleared (except Lord).');
        }

        // 2. Delete from genesis_whitelist (to allow them to claim again)
        console.log('--- Cleaning Whitelist ---');
        const { data: whiteData, error: whiteError } = await supabase
            .from('genesis_whitelist')
            .delete()
            .neq('wallet_address', LORD_WALLET);

        if (whiteError) {
            console.error('🔴 Error deleting whitelist entries:', whiteError.message);
        } else {
            console.log('✅ Whitelist cleared (except Lord).');
        }

        console.log('\n✨ Reset complete! Users can now claim their usernames again.');
    } catch (err) {
        console.error('💥 Unexpected error during reset:', err);
    }
}

resetProfiles();
