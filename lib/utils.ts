// lib/utils.ts
// Compress and crop image to perfect square (1:1 aspect ratio)
export const compressImage = (base64Str: string, size = 400): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Set canvas to square
            canvas.width = size;
            canvas.height = size;

            // Calculate crop dimensions to center
            const minDim = Math.min(img.width, img.height);
            const cropX = (img.width - minDim) / 2;
            const cropY = (img.height - minDim) / 2;

            // Draw cropped and scaled image (center crop like Instagram)
            ctx?.drawImage(
                img,
                cropX, cropY, minDim, minDim,  // Source crop (center square)
                0, 0, size, size                 // Destination (400x400)
            );

            // Compress to 85% quality for balance between size and quality
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
    });
};

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatTimeAgo(timestamp: string): string {
    if (!timestamp) return 'Just now';
    const now = Date.now();
    const created = new Date(timestamp).getTime();

    if (isNaN(created) || created > now) return 'Just now';

    const diff = now - created;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
}

// Format large numbers as M/K/B/T (Hype Notation)
export const formatCompact = (num: number): string => {
    if (!num && num !== 0) return '0';
    return new Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 2
    }).format(num);
};