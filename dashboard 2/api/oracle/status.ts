import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

// Mock auth for MVP. In production use real wallet signature verification.
const G1_WALLET = "G1NaEsx5Pg7dSmyYy6Jfraa74b7nTbmN9A9NuiK171Ma";

export async function GET(req: NextRequest) {
    const wallet = req.headers.get('x-wallet-address');

    // Basic Auth Check
    if (wallet !== G1_WALLET) {
        return NextResponse.json({ error: 'Unauthorized: G1 Only' }, { status: 403 });
    }

    try {
        // Fetch Latest Logs to calc stats (MVP approach)
        // In production, Agent would push state to Redis/DB.
        const logPath = './sentinel/logs/source_stats.json';
        let stats = { totalResolutions: 0, successfulResolutions: 0 };

        try {
            const content = await fs.readFile(logPath, 'utf-8');
            const data = JSON.parse(content);
            // Aggregate
            Object.values(data).forEach((s: any) => {
                stats.totalResolutions += s.totalResolutions;
                stats.successfulResolutions += s.successfulResolutions;
            });
        } catch { /* No stats yet */ }

        return NextResponse.json({
            isOnline: true, // If API is responding, Agent container is likely up (simulated)
            uptime: process.uptime(),
            marketsResolved: stats.totalResolutions,
            successRate: stats.totalResolutions > 0 ? (stats.successfulResolutions / stats.totalResolutions * 100).toFixed(1) : 0,
            feesCollected: (stats.totalResolutions * 0.05).toFixed(3), // Est. 0.05 SOL per market fees
            lastActivity: new Date().toISOString()
        });

    } catch (e) {
        return NextResponse.json({ error: 'Status check failed' }, { status: 500 });
    }
}
