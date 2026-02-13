const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
    console.log('--- Verifying Migration Tables ---');

    const { data: refTable, error: refError } = await supabase
        .from('referrals')
        .select('*')
        .limit(1);

    if (refError) {
        console.log('❌ referrals table NOT found or error:', refError.message);
    } else {
        console.log('✅ referrals table found.');
    }

    const { data: statsTable, error: statsError } = await supabase
        .from('system_stats')
        .select('*')
        .limit(1);

    if (statsError) {
        console.log('❌ system_stats table NOT found or error:', statsError.message);
    } else {
        console.log('✅ system_stats table found.');
    }

    const { data: shareTable, error: shareError } = await supabase
        .from('share_events')
        .select('*')
        .limit(1);

    if (shareError) {
        console.log('❌ share_events table NOT found or error:', shareError.message);
    } else {
        console.log('✅ share_events table found.');
    }
}

verifyMigration();
