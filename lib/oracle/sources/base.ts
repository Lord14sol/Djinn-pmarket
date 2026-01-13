import { Evidence, logOracleEvent } from '../index';

// ============================================
// BASE SOURCE INTERFACE
// ============================================

export interface SourceResult {
    success: boolean;
    evidence: Evidence[];
    error?: string;
}

export interface SourceConfig {
    enabled: boolean;
    [key: string]: unknown;
}

export abstract class BaseSource {
    protected name: string;
    protected displayName: string;
    protected config: SourceConfig;

    constructor(name: string, displayName: string, config: SourceConfig) {
        this.name = name;
        this.displayName = displayName;
        this.config = config;
    }

    abstract search(query: string, keywords: string[]): Promise<SourceResult>;

    protected async log(message: string, metadata?: Record<string, unknown>): Promise<void> {
        await logOracleEvent('fetch', message, this.name, metadata);
    }

    protected async logError(message: string, error: unknown): Promise<void> {
        await logOracleEvent('error', message, this.name, { error: String(error) });
    }

    isConfigured(): boolean {
        return this.config.enabled;
    }
}
