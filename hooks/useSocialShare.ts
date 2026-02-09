'use client';

import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { Share, ExternalLink } from 'lucide-react';

interface UseSocialShareReturn {
    shareRef: React.RefObject<HTMLDivElement>;
    handleShare: () => Promise<void>;
    isGenerating: boolean;
}

export function useSocialShare(title: string = "Djinn Position"): UseSocialShareReturn {
    const shareRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);

    const handleShare = async () => {
        if (!shareRef.current) return;

        try {
            setIsGenerating(true);

            // 1. Generate PNG
            // We scale up for better resolution (2x)
            const dataUrl = await toPng(shareRef.current, {
                cacheBust: true,
                pixelRatio: 2,
                backgroundColor: 'transparent' // Ensure transparent corners if needed
            });

            // 2. Download Image
            const link = document.createElement('a');
            link.download = `djinn-${title.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();

            // 3. Open Twitter Intent
            const tweetText = encodeURIComponent(`I just took a position on @DjinnFun! 🔮\n\n${title}\n\nCheck it out: https://djinn.fun`);
            window.open(`https://twitter.com/intent/tweet?text=${tweetText}`, '_blank');

        } catch (err) {
            console.error('Failed to generate image', err);
        } finally {
            setIsGenerating(false);
        }
    };

    return { shareRef, handleShare, isGenerating };
}
