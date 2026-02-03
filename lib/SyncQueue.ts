'use client';

// -------------------------------------------------------------------
// SYNC QUEUE
// -------------------------------------------------------------------
// A persistent queue for Supabase sync operations.
// - Buffers writes to localStorage.
// - Processes in background with exponential backoff retries.
// - Survives page refreshes.
// -------------------------------------------------------------------

export type SyncTask = {
    id: string;
    type: 'ACTIVITY' | 'BET' | 'MARKET_UPDATE' | 'PROFILE';
    payload: Record<string, unknown>;
    attempts: number;
    createdAt: number;
    lastAttempt?: number;
    error?: string;
};

const QUEUE_KEY = 'djinn_sync_queue';
const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 2000;

class SyncQueueClass {
    private queue: SyncTask[] = [];
    private isProcessing = false;
    private handlers: Map<SyncTask['type'], (payload: Record<string, unknown>) => Promise<void>> = new Map();

    constructor() {
        if (typeof window !== 'undefined') {
            this.load();
            // Start processing on init
            setTimeout(() => this.process(), 1000);
        }
    }

    /**
     * Register a handler for a specific task type.
     */
    registerHandler(type: SyncTask['type'], handler: (payload: Record<string, unknown>) => Promise<void>) {
        this.handlers.set(type, handler);
    }

    /**
     * Add a new task to the queue.
     */
    add(type: SyncTask['type'], payload: Record<string, unknown>) {
        const task: SyncTask = {
            id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
            type,
            payload,
            attempts: 0,
            createdAt: Date.now(),
        };
        this.queue.push(task);
        this.save();
        console.log(`[SyncQueue] Added task: ${type}`, task.id);

        // Trigger processing if not already running
        if (!this.isProcessing) {
            this.process();
        }
    }

    /**
     * Get current queue length (for UI display).
     */
    get pendingCount(): number {
        return this.queue.length;
    }

    /**
     * Get all pending tasks (for debugging).
     */
    getPending(): SyncTask[] {
        return [...this.queue];
    }

    /**
     * Clear all tasks (use with caution).
     */
    clear() {
        this.queue = [];
        this.save();
    }

    // --- Private ---

    private load() {
        try {
            const raw = localStorage.getItem(QUEUE_KEY);
            if (raw) {
                this.queue = JSON.parse(raw);
                console.log(`[SyncQueue] Loaded ${this.queue.length} pending tasks from storage.`);
            }
        } catch (e) {
            console.error('[SyncQueue] Failed to load from storage:', e);
            this.queue = [];
        }
    }

    private save() {
        try {
            localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
        } catch (e) {
            console.error('[SyncQueue] Failed to save to storage:', e);
        }
    }

    private async process() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;

        console.log(`[SyncQueue] Processing ${this.queue.length} tasks...`);

        // Process tasks one at a time
        while (this.queue.length > 0) {
            const task = this.queue[0];
            const handler = this.handlers.get(task.type);

            if (!handler) {
                console.warn(`[SyncQueue] No handler for type: ${task.type}. Skipping.`);
                this.queue.shift();
                this.save();
                continue;
            }

            try {
                task.attempts++;
                task.lastAttempt = Date.now();
                await handler(task.payload);

                // Success - remove from queue
                console.log(`[SyncQueue] ✅ Task ${task.id} completed.`);
                this.queue.shift();
                this.save();

            } catch (error: any) {
                task.error = error.message || 'Unknown error';
                console.error(`[SyncQueue] ❌ Task ${task.id} failed (attempt ${task.attempts}):`, task.error);

                if (task.attempts >= MAX_ATTEMPTS) {
                    // Give up - move to dead letter (just remove for now)
                    console.error(`[SyncQueue] Task ${task.id} exceeded max attempts. Dropping.`);
                    this.queue.shift();
                    this.save();
                } else {
                    // Exponential backoff
                    const delay = BASE_DELAY_MS * Math.pow(2, task.attempts - 1);
                    console.log(`[SyncQueue] Retrying in ${delay}ms...`);
                    this.save();
                    await new Promise(r => setTimeout(r, delay));
                }
            }
        }

        this.isProcessing = false;
        console.log('[SyncQueue] Queue empty.');
    }
}

// Export as singleton
export const SyncQueue = new SyncQueueClass();
