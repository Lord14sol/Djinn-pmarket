const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    const testWallet = 'TestWallet_' + Math.random().toString(36).substring(7);
    console.log('--- Testing Manual Insert for:', testWallet, '---');

    const { data, error } = await supabase
        .from('profiles')
        .insert({
            wallet_address: testWallet,
            username: 'testuser_' + Math.random().toString(36).substring(7),
            bio: 'Test Trigger',
            avatar_url: '/pink-pfp.png'
        })
        .select()
        .single();

    if (error) {
        console.error('Insert Error:', error);
    } else {
        console.log('Inserted Profile:');
        console.log(`- num=${data.user_number}, tier=${data.tier}, code=${data.referral_code}, access=${data.has_access}`);

        // Cleanup
        await supabase.from('profiles').delete().eq('wallet_address', testWallet);
    }
}

testInsert();
