const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Global Stats ---');
    const { data: stats, error: statsError } = await supabase
        .from('system_stats')
        .select('*')
        .eq('id', 'main')
        .single();

    if (statsError) console.error('Stats Error:', statsError);
    else console.log('Stats:', stats);

    console.log('\n--- Checking User Count ---');
    const { count, error: countError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

    if (countError) console.error('Count Error:', countError);
    else console.log('Total Profiles:', count);

    console.log('\n--- Last 5 Profiles ---');
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('username, user_number, tier, has_access, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (profError) console.error('Profiles Error:', profError);
    else console.log('Last 5 Profiles:', profiles);
}

check();
