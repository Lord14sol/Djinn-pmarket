import { NextResponse } from 'next/server';

// In-memory database (resets with server restart)
// In production, this would connect to Supabase or another persistent store
let markets: any[] = [];

export async function GET() {
    return NextResponse.json(markets);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const newMarket = {
            id: body.id || `mkt_${Date.now()}`,
            title: body.title,
            description: body.description || '',
            sourceUrl: body.sourceUrl || '',
            status: 'PENDING', // PENDING -> ANALYZING -> VERIFIED/REJECTED/UNCERTAIN
            imageUrl: body.imageUrl || body.icon || "https://media.istockphoto.com/id/1346575545/photo/metaverse-digital-cyber-world-technology-man-with-virtual-reality-vr-goggle-playing-ar.jpg",
            creator: body.creator || body.wallet_address || 'Unknown',
            creatorAvatar: body.creatorAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
            marketPda: body.marketPda || body.market_pda || null,

            // Cerberus 3-Dog System Results
            dog1Result: null as any, // { score, report, logs }
            dog2Result: null as any, // { score, report, logs }
            dog3Result: null as any, // { score, verdict, requiresHuman, report, logs }

            // Individual scores for quick access
            dog1Score: 0,
            dog2Score: 0,
            dog3Score: 0,

            // Final verdict from DOG 3
            verdict: null as string | null, // 'VERIFIED' | 'UNCERTAIN' | 'REJECTED'
            requiresHuman: true,

            // LORD Override (when manual decision is made)
            lordOverride: null as { decision: string; timestamp: number; reason: string } | null,

            // Legacy fields for backwards compatibility
            logsDog1: "",
            logsDog2: "",
            logsDog3: "",
            cerberusLogs: [],

            createdAt: new Date().toISOString()
        };
        markets.push(newMarket);
        console.log('[API] New market registered:', newMarket.id);
        return NextResponse.json(newMarket);
    } catch (e) {
        console.error('[API] Error creating market:', e);
        return NextResponse.json({ error: 'Error creating market' }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    try {
        const body = await req.json();
        const idx = markets.findIndex(m => m.id === body.id);

        if (idx !== -1) {
            // Update status if provided
            if (body.status) {
                markets[idx].status = body.status;
            }

            // Update Dog Results (full objects from Cerberus)
            if (body.dog1Result) {
                markets[idx].dog1Result = body.dog1Result;
                markets[idx].dog1Score = body.dog1Result.score || 0;
                markets[idx].logsDog1 = (body.dog1Result.logs || []).join('\n');
            }
            if (body.dog2Result) {
                markets[idx].dog2Result = body.dog2Result;
                markets[idx].dog2Score = body.dog2Result.score || 0;
                markets[idx].logsDog2 = (body.dog2Result.logs || []).join('\n');
            }
            if (body.dog3Result) {
                markets[idx].dog3Result = body.dog3Result;
                markets[idx].dog3Score = body.dog3Result.score || 0;
                markets[idx].logsDog3 = (body.dog3Result.logs || []).join('\n');
                markets[idx].verdict = body.dog3Result.verdict;
                markets[idx].requiresHuman = body.dog3Result.requiresHuman;
            }

            // Legacy dog log updates
            if (body.logsDog1 !== undefined) {
                markets[idx].logsDog1 = body.logsDog1;
            }
            if (body.logsDog2 !== undefined) {
                markets[idx].logsDog2 = body.logsDog2;
            }
            if (body.logsDog3 !== undefined) {
                markets[idx].logsDog3 = body.logsDog3;
            }

            // Append to legacy logs if a single log line is sent
            if (body.logLine) {
                markets[idx].cerberusLogs = [...(markets[idx].cerberusLogs || []), body.logLine];
            }

            // LORD Override
            if (body.lordOverride) {
                markets[idx].lordOverride = body.lordOverride;
                markets[idx].status = body.lordOverride.decision;
            }

            console.log('[API] Market updated:', markets[idx].id, '| Status:', markets[idx].status, '| Verdict:', markets[idx].verdict);
            return NextResponse.json(markets[idx]);
        }

        return NextResponse.json({ error: 'Market not found' }, { status: 404 });
    } catch (e) {
        console.error('[API] Error updating market:', e);
        return NextResponse.json({ error: 'Error updating market' }, { status: 500 });
    }
}

// DELETE - For admin cleanup
export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url);
        const id = url.searchParams.get('id');

        if (id) {
            const idx = markets.findIndex(m => m.id === id);
            if (idx !== -1) {
                markets.splice(idx, 1);
                return NextResponse.json({ success: true });
            }
            return NextResponse.json({ error: 'Not found' }, { status: 404 });
        }

        // Clear all markets (admin only)
        markets = [];
        return NextResponse.json({ success: true, message: 'All markets cleared' });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
