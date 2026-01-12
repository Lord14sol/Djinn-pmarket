'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import CreateMarketModal from '@/components/CreateMarketModal';

interface ModalContextType {
    isCreateMarketOpen: boolean;
    openCreateMarket: () => void;
    closeCreateMarket: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [isCreateMarketOpen, setIsCreateMarketOpen] = useState(false);

    const openCreateMarket = () => setIsCreateMarketOpen(true);
    const closeCreateMarket = () => setIsCreateMarketOpen(false);

    return (
        <ModalContext.Provider value={{ isCreateMarketOpen, openCreateMarket, closeCreateMarket }}>
            {children}
            <CreateMarketModal
                isOpen={isCreateMarketOpen}
                onClose={closeCreateMarket}
            />
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
