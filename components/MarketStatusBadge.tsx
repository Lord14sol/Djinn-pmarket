import React from 'react';
import { Check, X, AlertTriangle, Loader2 } from 'lucide-react';

export const MarketStatusBadge = ({ status }: { status: string }) => {
    const s = status ? status.toUpperCase() : 'UNKNOWN';

    // VERIFIED: Pink Check (Icon Only)
    if (s === 'VERIFIED') return (
        <div className="bg-[#F492B7]/10 border border-[#F492B7]/50 p-1 rounded-full shadow-[0_0_12px_rgba(244,146,183,0.25)]" title="Verified">
            <Check size={14} className="text-[#F492B7]" strokeWidth={3} />
        </div>
    );

    // REJECTED: Red X (Icon Only)
    if (s === 'REJECTED') return (
        <div className="bg-red-500/10 border border-red-500/50 p-1 rounded-full" title="Rejected">
            <X size={14} className="text-red-500" strokeWidth={3} />
        </div>
    );

    // REVIEW: Amber Triangle (Icon Only)
    if (s === 'UNRESOLVABLE' || s === 'UNCERTAIN' || s === 'MANUAL_REQUIRED') return (
        <div className="bg-amber-500/10 border border-amber-500/50 p-1 rounded-full animate-pulse" title="Needs Review">
            <AlertTriangle size={14} className="text-amber-500" strokeWidth={3} />
        </div>
    );

    // PENDING/ANALYZING: Hidden (User asked to erase "analyzing") or just a grey dot for unverified
    if (s === 'PENDING' || s === 'ANALYZING') return null;

    return null;
};
