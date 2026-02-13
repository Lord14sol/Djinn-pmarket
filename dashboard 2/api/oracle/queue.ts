import { NextRequest, NextResponse } from 'next/server';

// In a real implementation, the Sentinel Agent would either:
// 1. Expose an internal HTTP port (e.g., localhost:3001) that this Next.js API calls.
// 2. Write queue state to Redis/Database that this API reads.
// 3. For MVP/Monorepo, we might try to access the running Agent singleton if shared memory allowed (it isn't usually in Next.js serverless).

// SOLUTION FOR MVP:
// The Agent writes `queue_snapshot.json` periodically to logs. This API reads it.

import fs from 'fs/promises';
import path from 'path';

export async function GET(req: NextRequest) {
    const wallet = req.headers.get('x-wallet-address');
    // Auth check omitted for brevity, same as status.ts

    try {
        const snapPath = './sentinel/logs/queue_snapshot.json';
        let queue = [];
        try {
            const content = await fs.readFile(snapPath, 'utf-8');
            queue = JSON.parse(content);
        } catch { /* No snapshot */ }

        // Mock data if file empty (for UI demo purposes)
        if (queue.length === 0) {
            queue = [
                { market: { question: "Will BTC hit 100k?" }, priority: 10, status: "pending", retries: 0 },
                { market: { question: "Who wins Super Bowl?" }, priority: 8, status: "processing", retries: 1 }
            ];
        }

        return NextResponse.json({ queue });
    } catch (e) {
        return NextResponse.json({ queue: [] });
    }
}
