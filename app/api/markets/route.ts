import { NextResponse } from 'next/server';
import * as supabaseDb from '@/lib/supabase-db';

// -------------------------------------------------------------------
// MARKETS API - PERSISTENT VERSION (Supabase)
// -------------------------------------------------------------------
// This API is now backed by Supabase. Data persists across restarts.
// -------------------------------------------------------------------

export async function GET() {
    try {
        const markets = await supabaseDb.getMarkets();
        return NextResponse.json(markets);
    } catch (e) {
        console.error('[API] Error fetching markets:', e);
        return NextResponse.json({ error: 'Error fetching markets' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Validate required fields
        if (!body.title || !body.slug) {
            return NextResponse.json({ error: 'Missing required fields: title, slug' }, { status: 400 });
        }

        // Prepare market object for Supabase
        const newMarket = {
            slug: body.slug,
            title: body.title,
            description: body.description || '',
            banner_url: body.imageUrl || body.icon || body.banner_url || null,
            creator_wallet: body.creator || body.wallet_address || body.creator_wallet || 'Unknown',
            market_pda: body.marketPda || body.market_pda || null,
            yes_token_mint: body.yesTokenMint || body.yes_token_mint || null,
            no_token_mint: body.noTokenMint || body.no_token_mint || null,
            tx_signature: body.txSignature || body.tx_signature || null,
            resolved: false,
            category: body.category || 'Trending', // Default category
            options: body.options || ['Yes', 'No'], // Default outcomes
        };

        const result = await supabaseDb.createMarket(newMarket as any);

        if (result.error) {
            console.error('[API] Error creating market:', result.error);
            return NextResponse.json({ error: 'Error creating market' }, { status: 500 });
        }

        console.log('[API] New market registered:', result.data?.slug);
        return NextResponse.json(result.data);
    } catch (e) {
        console.error('[API] Error creating market:', e);
        return NextResponse.json({ error: 'Error creating market' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();

        if (!body.slug) {
            return NextResponse.json({ error: 'Missing slug' }, { status: 400 });
        }

        // For now, we only support resolution updates via the resolveMarket function
        // Other updates can be added here as needed using supabase directly
        if (body.resolved && body.winning_outcome) {
            const result = await supabaseDb.resolveMarket(body.slug, body.winning_outcome);
            if (result.error) {
                return NextResponse.json({ error: 'Error resolving market' }, { status: 500 });
            }
            return NextResponse.json(result);
        }

        // Generic update
        const { slug, ...updates } = body;

        // Remove known read-only or sensitive fields if they sneak in
        delete updates.id;
        delete updates.created_at;
        delete updates.creator_wallet; // Use a separate transfer endpoint if needed
        delete updates.tx_signature;

        const result = await supabaseDb.updateMarket(slug, updates);

        if (result.error) {
            return NextResponse.json({ error: 'Error updating market' }, { status: 500 });
        }

        return NextResponse.json({ success: true, data: result.data });
    } catch (e) {
        console.error('[API] Error updating market:', e);
        return NextResponse.json({ error: 'Error updating market' }, { status: 500 });
    }
}

// DELETE - For admin cleanup (PROTECTED)
export async function DELETE(req: Request) {
    try {
        // --- SECURITY CHECK ---
        const adminSecret = req.headers.get('x-admin-secret');
        if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
            console.warn('[API] Unauthorized DELETE attempt');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(req.url);
        const slug = url.searchParams.get('slug');

        if (slug) {
            // Delete specific market (not implemented in supabase-db yet, add if needed)
            // For now, return not implemented
            return NextResponse.json({ error: 'Single market delete not implemented' }, { status: 501 });
        }

        // Clear all markets - DANGEROUS, requires ADMIN_SECRET
        // This would need a bulk delete function in supabase-db
        return NextResponse.json({ error: 'Bulk delete not implemented' }, { status: 501 });
    } catch (e) {
        console.error('[API] Error deleting market:', e);
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
