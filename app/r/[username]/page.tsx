'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ReferralLanding() {
    const router = useRouter();
    const params = useParams();
    const username = params.username as string;

    useEffect(() => {
        if (username) {
            console.log(`🔮 Referral detected for: @${username}`);
            localStorage.setItem('referredBy', username);

            // Redirect to home after a small delay to ensure localStorage is set
            const timeout = setTimeout(() => {
                router.push('/');
            }, 1500);

            return () => clearTimeout(timeout);
        } else {
            router.push('/');
        }
    }, [username, router]);

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
            <div className="relative">
                {/* Background Glow */}
                <div className="absolute inset-[-100px] bg-[#F492B7]/20 blur-[100px] rounded-full animate-pulse" />

                <div className="relative text-center space-y-8 animate-in fade-in zoom-in duration-700">
                    <div className="w-24 h-24 mx-auto bg-white border-[4px] border-black rounded-[2rem] flex items-center justify-center shadow-[8px_8px_0px_0px_rgba(244,146,183,1)]">
                        <Loader2 className="w-10 h-10 animate-spin text-black" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-4xl font-black lowercase tracking-tighter text-white italic">
                            accepting invitation...
                        </h1>
                        <p className="text-[#F492B7] font-black uppercase tracking-[0.3em] text-[10px]">
                            from @{username}
                        </p>
                    </div>

                    <p className="text-gray-500 font-bold lowercase tracking-tight max-w-[200px] mx-auto leading-tight">
                        entering the future of prediction markets
                    </p>
                </div>
            </div>
        </div>
    );
}
