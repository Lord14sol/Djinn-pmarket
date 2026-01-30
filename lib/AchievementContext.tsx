'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface MedalAchievement {
    name: string;
    description: string;
    image_url: string;
}

interface AchievementContextType {
    unlockAchievement: (medal: MedalAchievement) => void;
    closeAchievement: () => void;
    currentAchievement: MedalAchievement | null;
    isVisible: boolean;
}

const AchievementContext = createContext<AchievementContextType | undefined>(undefined);

export function AchievementProvider({ children }: { children: ReactNode }) {
    const [currentAchievement, setCurrentAchievement] = useState<MedalAchievement | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [queue, setQueue] = useState<MedalAchievement[]>([]);

    const unlockAchievement = React.useCallback((medal: MedalAchievement) => {
        setQueue(prev => [...prev, medal]);
    }, []);

    const closeAchievement = React.useCallback(() => {
        setIsVisible(false);
        // Delay clearing current achievement to allow exit animation
        setTimeout(() => setCurrentAchievement(null), 1000);
    }, []);

    // Effect 1: Process the queue when not visible
    useEffect(() => {
        if (queue.length > 0 && !isVisible && !currentAchievement) {
            const next = queue[0];
            setCurrentAchievement(next);
            setIsVisible(true);
            setQueue(prev => prev.slice(1));
        }
    }, [queue, isVisible, currentAchievement]);

    // Effect 2: Handle the 30s timer separately
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (isVisible) {
            timer = setTimeout(() => {
                closeAchievement();
            }, 30000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [isVisible, closeAchievement]);

    const contextValue = React.useMemo(() => ({
        unlockAchievement,
        closeAchievement,
        currentAchievement,
        isVisible
    }), [unlockAchievement, closeAchievement, currentAchievement, isVisible]);

    return (
        <AchievementContext.Provider value={contextValue}>
            {children}
        </AchievementContext.Provider>
    );
}

export function useAchievement() {
    const context = useContext(AchievementContext);
    if (context === undefined) {
        throw new Error('useAchievement must be used within an AchievementProvider');
    }
    return context;
}
