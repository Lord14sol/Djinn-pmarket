const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log('--- Checking Last Profiles in Detail ---');
    const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('username, user_number, tier, has_access, referral_code, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (profError) {
        console.error('Profiles Error:', profError);
    } else {
        console.log('Last 5 Profiles:');
        profiles.forEach(p => {
            console.log(`- @${p.username}: num=${p.user_number}, tier=${p.tier}, code=${p.referral_code}, access=${p.has_access}`);
        });
    }
}

check();
