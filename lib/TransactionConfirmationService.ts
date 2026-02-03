'use client';

import { Connection, SignatureStatus } from '@solana/web3.js';

// -------------------------------------------------------------------
// TYPES
// -------------------------------------------------------------------
export type TxStatus = 'PENDING' | 'CONFIRMING' | 'CONFIRMED' | 'FAILED' | 'EXPIRED';

export interface TxConfirmationState {
    signature: string;
    status: TxStatus;
    error?: string;
    slot?: number;
    confirmations?: number;
}

type TxCallback = (state: TxConfirmationState) => void;

// -------------------------------------------------------------------
// TRANSACTION CONFIRMATION SERVICE
// -------------------------------------------------------------------
// Singleton service to track and confirm Solana transactions.
// Uses WebSocket subscription with polling fallback.
// -------------------------------------------------------------------

class TransactionConfirmationServiceClass {
    private subscriptions: Map<string, { callbacks: TxCallback[]; unsubscribe?: number }> = new Map();
    private connection: Connection | null = null;

    /**
     * Initialize the service with a Solana connection.
     * Must be called before using other methods.
     */
    init(connection: Connection) {
        this.connection = connection;
        console.log('[TxService] Initialized with RPC:', connection.rpcEndpoint);
    }

    /**
     * Submit a transaction and track its confirmation.
     * @param signature - The transaction signature to track.
     * @returns Promise that resolves when confirmed or rejects on failure.
     */
    async confirm(signature: string, timeoutMs: number = 60000): Promise<TxConfirmationState> {
        if (!this.connection) throw new Error('[TxService] Not initialized. Call init() first.');

        const startTime = Date.now();
        const state: TxConfirmationState = { signature, status: 'CONFIRMING' };

        // Notify subscribers of initial state
        this.notify(signature, state);

        return new Promise((resolve, reject) => {
            // --- WebSocket Subscription ---
            let wsSubscriptionId: number | undefined;
            try {
                wsSubscriptionId = this.connection!.onSignature(
                    signature,
                    (result, context) => {
                        if (result.err) {
                            state.status = 'FAILED';
                            state.error = JSON.stringify(result.err);
                            this.notify(signature, state);
                            this.cleanup(signature, wsSubscriptionId);
                            reject(state);
                        } else {
                            state.status = 'CONFIRMED';
                            state.slot = context.slot;
                            this.notify(signature, state);
                            this.cleanup(signature, wsSubscriptionId);
                            resolve(state);
                        }
                    },
                    'confirmed'
                );
            } catch (e) {
                console.warn('[TxService] WebSocket subscription failed, using polling fallback.');
            }

            // --- Polling Fallback (in case WS is slow or unavailable) ---
            const poll = async () => {
                if (state.status === 'CONFIRMED' || state.status === 'FAILED') return;

                try {
                    const statusRes = await this.connection!.getSignatureStatus(signature, { searchTransactionHistory: true });
                    const value = statusRes?.value;

                    if (value?.err) {
                        state.status = 'FAILED';
                        state.error = JSON.stringify(value.err);
                        this.notify(signature, state);
                        this.cleanup(signature, wsSubscriptionId);
                        reject(state);
                        return;
                    }

                    if (value?.confirmationStatus === 'confirmed' || value?.confirmationStatus === 'finalized') {
                        state.status = 'CONFIRMED';
                        state.slot = value.slot;
                        state.confirmations = value.confirmations ?? 0;
                        this.notify(signature, state);
                        this.cleanup(signature, wsSubscriptionId);
                        resolve(state);
                        return;
                    }

                    // Check timeout
                    if (Date.now() - startTime > timeoutMs) {
                        state.status = 'EXPIRED';
                        state.error = 'Transaction confirmation timed out.';
                        this.notify(signature, state);
                        this.cleanup(signature, wsSubscriptionId);
                        reject(state);
                        return;
                    }

                    // Continue polling
                    setTimeout(poll, 2000);
                } catch (pollError) {
                    console.error('[TxService] Poll error:', pollError);
                    setTimeout(poll, 3000); // Retry with longer delay on error
                }
            };

            // Start polling after a short delay (give WS a chance)
            setTimeout(poll, 1500);
        });
    }

    /**
     * Subscribe to updates for a specific transaction.
     */
    subscribe(signature: string, callback: TxCallback): () => void {
        if (!this.subscriptions.has(signature)) {
            this.subscriptions.set(signature, { callbacks: [] });
        }
        this.subscriptions.get(signature)!.callbacks.push(callback);

        // Return unsubscribe function
        return () => {
            const sub = this.subscriptions.get(signature);
            if (sub) {
                sub.callbacks = sub.callbacks.filter(cb => cb !== callback);
            }
        };
    }

    /**
     * Get current status of a tracked transaction.
     */
    getStatus(signature: string): TxStatus | null {
        const sub = this.subscriptions.get(signature);
        return sub ? 'CONFIRMING' : null; // Simplified; real impl would track state.
    }

    // --- Private Helpers ---

    private notify(signature: string, state: TxConfirmationState) {
        const sub = this.subscriptions.get(signature);
        if (sub) {
            sub.callbacks.forEach(cb => cb(state));
        }
    }

    private cleanup(signature: string, wsSubscriptionId?: number) {
        if (wsSubscriptionId !== undefined && this.connection) {
            try {
                this.connection.removeSignatureListener(wsSubscriptionId);
            } catch (e) { /* ignore */ }
        }
        // Keep subscription in map briefly for late subscribers, then clean up
        setTimeout(() => this.subscriptions.delete(signature), 10000);
    }
}

// Export as singleton
export const TransactionConfirmationService = new TransactionConfirmationServiceClass();
