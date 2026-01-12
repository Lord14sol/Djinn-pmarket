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

        // Construct new URL
        const newUrl = new URL(window.location.href);
        const currentPath = newUrl.pathname;

        // If we are NOT on home page, go to home page with category param
        if (currentPath !== '/') {
            const destUrl = new URL(window.location.origin);
            destUrl.pathname = '/';
            if (category !== "Trending") {
                destUrl.searchParams.set('category', category);
            }
            router.push(destUrl.toString());
        } else {
            // We are already on home, just update params
            if (category === "Trending") {
                newUrl.searchParams.delete('category');
            } else {
                newUrl.searchParams.set('category', category);
            }
            router.push(newUrl.pathname + newUrl.search, { scroll: false });
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
