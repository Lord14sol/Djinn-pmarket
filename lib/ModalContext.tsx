'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import CreateMarketModal from '@/components/CreateMarketModal';
import ActivityFeedModal from '@/components/ActivityFeedModal';

interface ModalContextType {
    isCreateMarketOpen: boolean;
    openCreateMarket: () => void;
    closeCreateMarket: () => void;
    isActivityFeedOpen: boolean;
    openActivityFeed: () => void;
    closeActivityFeed: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isCreateMarketOpen, setIsCreateMarketOpen] = useState(false);
    const [isActivityFeedOpen, setIsActivityFeedOpen] = useState(false);

    const openCreateMarket = () => setIsCreateMarketOpen(true);
    const closeCreateMarket = () => setIsCreateMarketOpen(false);

    const openActivityFeed = () => setIsActivityFeedOpen(true);
    const closeActivityFeed = () => setIsActivityFeedOpen(false);

    return (
        <ModalContext.Provider value={{
            isCreateMarketOpen, openCreateMarket, closeCreateMarket,
            isActivityFeedOpen, openActivityFeed, closeActivityFeed
        }}>
            {children}
            <CreateMarketModal
                isOpen={isCreateMarketOpen}
                onClose={closeCreateMarket}
            />
            <ActivityFeedModal />
        </ModalContext.Provider>
    );
}

export function useModal() {
    const context = useContext(ModalContext);
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider');
    }
    return context;
}
