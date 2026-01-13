import { NextResponse } from 'next/server';

// Dynamic import to avoid build-time errors
async function getOracleModule() {
    return await import('../../../../lib/oracle');
}

// GET /api/oracle/logs - Get Oracle Bot logs
export async function GET(request: Request) {
    try {
        const { getOracleLogs } = await getOracleModule();
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '100', 10);

        const logs = await getOracleLogs(Math.min(limit, 500));
        return NextResponse.json(logs);
    } catch (error) {
        console.error('Error getting oracle logs:', error);
        return NextResponse.json(
            { error: 'Failed to get oracle logs', details: String(error) },
            { status: 500 }
        );
    }
}
