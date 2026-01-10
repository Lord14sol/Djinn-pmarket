'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CategoryContextType {
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    activeSubcategory: string;
    setActiveSubcategory: (subcategory: string) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
    const [activeCategory, setActiveCategory] = useState("Trending");
    const [activeSubcategory, setActiveSubcategory] = useState("");

    return (
        <CategoryContext.Provider value={{
            activeCategory,
            setActiveCategory,
            activeSubcategory,
            setActiveSubcategory
        }}>
            {children}
        </CategoryContext.Provider>
    );
}

export function useCategory() {
    const context = useContext(CategoryContext);
    if (!context) {
        throw new Error('useCategory must be used within a CategoryProvider');
    }
    return context;
}
