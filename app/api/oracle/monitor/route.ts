import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
    try {
        const { slug } = await request.json();

        if (!slug) {
            return NextResponse.json({ error: 'Market slug required' }, { status: 400 });
        }

        // Enable monitoring for this market
        const { error } = await supabase
            .from('markets')
            .update({ monitoring_enabled: true })
            .eq('slug', slug);

        if (error) {
            console.error('Error enabling monitoring:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Log the event
        // We assume the caller (client) handles the "oracle log" or we do it here.
        // Ideally we should log to oracle_logs here too.

        // Lazy import oracle module to avoid circular deps if any, or just use raw insert
        const { error: logError } = await supabase
            .from('oracle_logs')
            .insert({
                type: 'system',
                source: 'system',
                message: `Auto-monitoring enabled for market: ${slug}`,
                metadata: { trigger: 'first_bet' }
            });

        return NextResponse.json({ success: true, message: `Monitoring enabled for ${slug}` });
    } catch (error) {
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
