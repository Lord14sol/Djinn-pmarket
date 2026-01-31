'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface CategoryContextType {
    activeCategory: string;
    setActiveCategory: (category: string) => void;
    activeSubcategory: string;
    setActiveSubcategory: (subcategory: string) => void;
}

const CategoryContext = createContext<CategoryContextType | undefined>(undefined);

export function CategoryProvider({ children }: { children: ReactNode }) {
    const searchParams = useSearchParams();
    const router = useRouter();

    // Initialize from URL or default to "Trending"
    const initialCategory = searchParams.get('category') || "Trending";

    const [activeCategory, setActiveCategoryState] = useState(initialCategory);
    const [activeSubcategory, setActiveSubcategory] = useState("");

    // Update URL when category changes
    const setActiveCategory = (category: string) => {
        setActiveCategoryState(category);

        // Always navigate to /markets when a category is selected
        // This ensures that if the user clicks a category from the home page, they go to markets.
        if (category === "Trending") {
            router.push('/markets', { scroll: false });
        } else {
            router.push(`/markets?category=${encodeURIComponent(category)}`, { scroll: false });
        }
    };

    // Sync if back button is pressed (optional but good)
    useEffect(() => {
        const cat = searchParams.get('category');
        if (cat && cat !== activeCategory) {
            setActiveCategoryState(cat);
        } else if (!cat && activeCategory !== "Trending") {
            setActiveCategoryState("Trending");
        }
    }, [searchParams]);

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
