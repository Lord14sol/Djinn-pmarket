/**
 * Djinn Webhook Types — Event payloads for real-time bot notifications
 *
 * Bot developers register a webhook URL and receive these events:
 *   POST https://bot.example.com/djinn
 *   { event: "market_created", data: { ... } }
 */

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type WebhookEventType =
    | 'market_created'
    | 'market_resolved'
    | 'chronos_round'
    | 'bounty_available'
    | 'bounty_expiring'
    | 'bot_frozen'
    | 'bot_unfrozen'
    | 'vault_circuit_breaker'
    | 'vault_deposit'
    | 'vault_withdrawal'
    | 'slash_proposal'
    | 'slash_resolved'
    | 'tier_upgrade';

// ═══════════════════════════════════════════════════════════════════════════════
// EVENT PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

export interface MarketCreatedEvent {
    event: 'market_created';
    data: {
        marketId: string;
        question: string;
        category: string;
        deadline: number;
        creator: string;
        isChronos: boolean;
    };
    timestamp: number;
}

export interface MarketResolvedEvent {
    event: 'market_resolved';
    data: {
        marketId: string;
        question: string;
        winningOutcome: number;
        yourPosition?: {
            outcome: number;
            shares: number;
            pnl: number;
        };
    };
    timestamp: number;
}

export interface ChronosRoundEvent {
    event: 'chronos_round';
    data: {
        asset: 'BTC' | 'ETH' | 'SOL';
        marketId: string;
        roundNumber: number;
        startPrice: number;
        expiresAt: number;
    };
    timestamp: number;
}

export interface BountyAvailableEvent {
    event: 'bounty_available';
    data: {
        bountyPoolId: string;
        marketId: string;
        question: string;
        bountyAmount: number;
        expiresAt: number;
        submissionsCount: number;
    };
    timestamp: number;
}

export interface BotFrozenEvent {
    event: 'bot_frozen';
    data: {
        botId: string;
        reason: 'cerberus_detection' | 'slash_proposal' | 'admin_action';
        details: string;
        appealDeadline?: number;
    };
    timestamp: number;
}

export interface VaultCircuitBreakerEvent {
    event: 'vault_circuit_breaker';
    data: {
        vaultId: string;
        botId: string;
        drawdownPercent: number;
        action: 'paused' | 'liquidating';
        currentAum: number;
        highWaterMark: number;
    };
    timestamp: number;
}

export interface SlashProposalEvent {
    event: 'slash_proposal';
    data: {
        proposalId: string;
        accusedBotId: string;
        reporterAddress: string;
        reason: 'wash_trading' | 'sybil' | 'front_running' | 'multi_bot_abuse';
        evidenceUri: string;
        defenseDeadline: number;
    };
    timestamp: number;
}

export interface TierUpgradeEvent {
    event: 'tier_upgrade';
    data: {
        botId: string;
        previousTier: 'Novice' | 'Verified' | 'Elite';
        newTier: 'Novice' | 'Verified' | 'Elite';
        newLimits: {
            maxPerTrade: number;
            maxPerDay: number;
            maxConcurrent: number;
        };
    };
    timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WEBHOOK ENVELOPE
// ═══════════════════════════════════════════════════════════════════════════════

export type DjinnWebhookPayload =
    | MarketCreatedEvent
    | MarketResolvedEvent
    | ChronosRoundEvent
    | BountyAvailableEvent
    | BotFrozenEvent
    | VaultCircuitBreakerEvent
    | SlashProposalEvent
    | TierUpgradeEvent;

export interface WebhookDelivery {
    id: string;
    webhookId: string;
    payload: DjinnWebhookPayload;
    deliveredAt: number;
    responseCode: number;
    retryCount: number;
}

/**
 * Verify webhook signature (HMAC-SHA256)
 * Bot developers should verify the X-Djinn-Signature header
 */
export function verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string
): boolean {
    // In production, use crypto.createHmac('sha256', secret).update(payload).digest('hex')
    // This is a type-safe placeholder
    const crypto = require('crypto');
    const expected = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
    return signature === `sha256=${expected}`;
}
