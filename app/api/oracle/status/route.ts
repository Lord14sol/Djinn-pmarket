import { NextResponse } from 'next/server';

// Dynamic import to avoid build-time errors when Supabase isn't configured
async function getOracleModule() {
    return await import('../../../../lib/oracle');
}

// GET /api/oracle/status - Get Oracle Bot status
export async function GET() {
    try {
        const { getOracleStatus } = await getOracleModule();
        const status = await getOracleStatus();
        return NextResponse.json(status);
    } catch (error) {
        console.error('Error getting oracle status:', error);
        return NextResponse.json(
            { error: 'Failed to get oracle status', details: String(error) },
            { status: 500 }
        );
    }
}

// POST /api/oracle/status - Start/Stop the Oracle Bot
export async function POST(request: Request) {
    try {
        const { updateOracleConfig, logOracleEvent } = await getOracleModule();
        const body = await request.json();
        const { action, wallet } = body;

        // TODO: Verify wallet is Protocol Authority
        // For now we'll trust the frontend validation

        if (action === 'start') {
            await updateOracleConfig('bot_enabled', true);
            await logOracleEvent('system', 'Oracle Bot started', 'api', { by: wallet });
            return NextResponse.json({ success: true, message: 'Oracle Bot started' });
        } else if (action === 'stop') {
            await updateOracleConfig('bot_enabled', false);
            await logOracleEvent('system', 'Oracle Bot stopped', 'api', { by: wallet });
            return NextResponse.json({ success: true, message: 'Oracle Bot stopped' });
        } else {
            return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
    } catch (error) {
        console.error('Error updating oracle status:', error);
        return NextResponse.json(
            { error: 'Failed to update oracle status', details: String(error) },
            { status: 500 }
        );
    }
}
