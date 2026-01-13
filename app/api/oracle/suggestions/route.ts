import { NextResponse } from 'next/server';

// Dynamic imports to avoid build-time errors
async function getOracleModule() {
    return await import('../../../../lib/oracle');
}

async function getSupabaseDb() {
    return await import('../../../../lib/supabase-db');
}

// GET /api/oracle/suggestions - List pending suggestions
export async function GET() {
    try {
        const { getPendingSuggestions } = await getOracleModule();
        const suggestions = await getPendingSuggestions();
        return NextResponse.json(suggestions);
    } catch (error) {
        console.error('Error getting suggestions:', error);
        return NextResponse.json(
            { error: 'Failed to get suggestions', details: String(error) },
            { status: 500 }
        );
    }
}

// POST /api/oracle/suggestions - Approve or reject a suggestion
export async function POST(request: Request) {
    try {
        const { approveSuggestion, rejectSuggestion, logOracleEvent } = await getOracleModule();
        const { resolveMarket } = await getSupabaseDb();

        const body = await request.json();
        const { suggestionId, action, wallet, notes, marketSlug, outcome } = body;

        if (!suggestionId || !action || !wallet) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        if (action === 'approve') {
            // First approve the suggestion
            await approveSuggestion(suggestionId, wallet, notes);

            // Then actually resolve the market
            if (marketSlug && outcome && ['YES', 'NO'].includes(outcome)) {
                const result = await resolveMarket(marketSlug, outcome);

                await logOracleEvent('approve',
                    `Market "${marketSlug}" resolved as ${outcome}`,
                    'api',
                    { suggestion_id: suggestionId, by: wallet, result }
                );

                return NextResponse.json({
                    success: true,
                    message: `Suggestion approved and market resolved as ${outcome}`,
                    resolution: result
                });
            }

            await logOracleEvent('approve',
                `Suggestion ${suggestionId} approved (no auto-resolution)`,
                'api',
                { suggestion_id: suggestionId, by: wallet }
            );

            return NextResponse.json({
                success: true,
                message: 'Suggestion approved'
            });

        } else if (action === 'reject') {
            await rejectSuggestion(suggestionId, wallet, notes);

            await logOracleEvent('reject',
                `Suggestion ${suggestionId} rejected`,
                'api',
                { suggestion_id: suggestionId, by: wallet, notes }
            );

            return NextResponse.json({
                success: true,
                message: 'Suggestion rejected'
            });

        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error processing suggestion:', error);
        return NextResponse.json(
            { error: 'Failed to process suggestion', details: String(error) },
            { status: 500 }
        );
    }
}
