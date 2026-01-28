
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetch() {
    console.log('Testing connection to:', supabaseUrl);

    // 1. Fetch any profile
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (error) {
        console.error('Error fetching profiles:', error);
    } else {
        console.log('Fetched profiles:', profiles);
    }

    // 2. Fetch specific market creator if possibe (need a slug or wallet)
    // Just listing 5 is enough to see if RLS blocks us.
}

testFetch();
