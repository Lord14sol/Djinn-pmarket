import fs from 'fs/promises';
import path from 'path';
import type { ResolutionResult } from '../types/index.ts';

interface SourceStats {
    totalResolutions: number;
    successfulResolutions: number;
    failedResolutions: number;
    reliability: number;
}

export class Logger {
    private logPath: string;
    private stats: Map<string, SourceStats>;

    constructor(basePath: string = './sentinel/logs') {
        this.logPath = basePath;
        this.stats = new Map();
        this.init();
    }

    private async init() {
        try {
            await fs.mkdir(this.logPath, { recursive: true });
            await this.loadStats();
        } catch (e) {
            console.error("Logger Init Failed:", e);
        }
    }

    async logResolution(result: ResolutionResult) {
        const date = new Date().toISOString().split('T')[0];
        const filename = `${date}.json`;
        const filepath = path.join(this.logPath, filename);

        // 1. Append Log
        let logs: ResolutionResult[] = [];
        try {
            const content = await fs.readFile(filepath, 'utf-8');
            logs = JSON.parse(content);
        } catch { /* File doesn't exist yet */ }

        logs.push(result);
        await fs.writeFile(filepath, JSON.stringify(logs, null, 2));

        // 2. Update Learning Stats
        this.updateSourceStats(result);
    }

    private updateSourceStats(result: ResolutionResult) {
        // Only 'learn' from successful resolutions or distinct failures
        // Learning heuristic: If consensus was strong, the participating sources are trusted.

        if (result.finalOutcome === 'YES' || result.finalOutcome === 'NO') {
            const domain = this.extractDomain(result.market.sourceLink);

            if (!this.stats.has(domain)) {
                this.stats.set(domain, {
                    totalResolutions: 0, successfulResolutions: 0, failedResolutions: 0, reliability: 0.5
                });
            }

            const stat = this.stats.get(domain)!;
            stat.totalResolutions++;
            stat.successfulResolutions++; // It contributed to a consensus
            stat.reliability = stat.successfulResolutions / stat.totalResolutions;

            this.saveStats();
        }
    }

    private extractDomain(url: string): string {
        try {
            return new URL(url).hostname;
        } catch {
            return 'unknown';
        }
    }

    getSourceReliability(url: string): number {
        const domain = this.extractDomain(url);
        return this.stats.get(domain)?.reliability || 0.5;
    }

    private async saveStats() {
        const filepath = path.join(this.logPath, 'source_stats.json');
        const data = Object.fromEntries(this.stats);
        await fs.writeFile(filepath, JSON.stringify(data, null, 2));
    }

    private async loadStats() {
        try {
            const filepath = path.join(this.logPath, 'source_stats.json');
            const content = await fs.readFile(filepath, 'utf-8');
            const parsed = JSON.parse(content);
            this.stats = new Map(Object.entries(parsed));
        } catch { /* No stats yet */ }
    }

    /**
     * Persist arbitrary structured logs (Escalation reports, Errors, etc.)
     */
    async persistLog(marketId: string, data: any) {
        const filepath = path.join(this.logPath, `event_log.json`);
        let history: any = {};
        try {
            const content = await fs.readFile(filepath, 'utf-8');
            history = JSON.parse(content);
        } catch { /* ignored */ }

        if (!history[marketId]) history[marketId] = [];
        history[marketId].push({
            timestamp: new Date().toISOString(),
            ...data
        });

        await fs.writeFile(filepath, JSON.stringify(history, null, 2));
    }
}
