// lib/ipfs.ts
// Simplified Image Upload for Djinn Markets
// For now, we use a static placeholder to avoid external API failures
// TODO: Set up your own Pinata account and add NEXT_PUBLIC_PINATA_JWT to .env.local

/**
 * Upload a base64 image to external storage.
 * Currently returns a placeholder URL to avoid API failures.
 * 
 * For production:
 * 1. Create a free Pinata account: https://www.pinata.cloud/
 * 2. Get your JWT token
 * 3. Add to .env.local: NEXT_PUBLIC_PINATA_JWT=your_token_here
 */
export async function uploadToIPFS(base64Image: string): Promise<string> {
    // Check if we have a Pinata JWT configured
    const pinataJwt = process.env.NEXT_PUBLIC_PINATA_JWT;

    if (pinataJwt && pinataJwt.length > 50) {
        try {
            // Real upload to Pinata
            const base64Data = base64Image.split(',')[1] || base64Image;
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/jpeg' });

            const formData = new FormData();
            formData.append('file', blob, `djinn_${Date.now()}.jpg`);

            const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${pinataJwt}`
                },
                body: formData
            });

            if (response.ok) {
                const data = await response.json();
                return `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`;
            }
        } catch (error) {
            console.warn('Pinata upload failed, using placeholder:', error);
        }
    }

    // Fallback: Return the base64 image directly
    // The compressed image is small enough to store in the database
    console.log('📷 Pinata not configured, using base64 image (set NEXT_PUBLIC_PINATA_JWT for IPFS uploads)');
    return base64Image;
}

/**
 * Quick check if string is a valid URL (not base64)
 */
export function isValidUrl(str: string): boolean {
    return str.startsWith('http://') || str.startsWith('https://') || str.startsWith('ipfs://');
}
