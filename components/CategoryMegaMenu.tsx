"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCategory } from '@/lib/CategoryContext';
import { AnimatePresence, motion } from 'framer-motion';

interface Category {
    id: string;
    name: string;
    slug: string;
    image: string;
    glowColor: string;
    subcategories?: { id: string; name: string; image?: string }[];
}

const CATEGORIES: Category[] = [
    {
        id: 'trending',
        name: 'Trending',
        slug: 'Trending',
        image: '/category-trending.png',
        glowColor: '#FF6B35'
    },
    {
        id: 'new',
        name: 'New',
        slug: 'New',
        image: '/category-new.jpg',
        glowColor: '#10B981'
    },
    {
        id: 'earth',
        name: 'Earth',
        slug: 'Earth',
        image: '/category-earth-v2.png',
        glowColor: '#06B6D4',
        subcategories: [
            { id: 'north-america', name: 'North America', image: '/region-north-america.png' },
            { id: 'south-america', name: 'South America', image: '/region-south-america.png' },
            { id: 'europe', name: 'Europe', image: '/region-europe.jpg' },
            { id: 'asia', name: 'Asia', image: '/region-asia.png' },
            { id: 'africa', name: 'Africa', image: '/region-africa.jpg' },
            { id: 'oceania', name: 'Oceania', image: '/region-oceania.png' }
        ]
    },
    {
        id: 'crypto',
        name: 'Crypto',
        slug: 'Crypto',
        image: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=600&q=80',
        glowColor: '#F59E0B'
    },
    {
        id: 'politics',
        name: 'Politics',
        slug: 'Politics',
        image: '/category-politics.jpg',
        glowColor: '#3B82F6'
    },
    {
        id: 'sports',
        name: 'Sports',
        slug: 'Sports',
        image: '/category-sports.png',
        glowColor: '#EC4899'
    },
    {
        id: 'trenches',
        name: 'Trenches',
        slug: 'Trenches',
        image: '/trenches-header.png',
        glowColor: '#84CC16'
    },
    {
        id: 'movies',
        name: 'Movies',
        slug: 'Movies',
        image: '/category-movies.png',
        glowColor: '#E50914'
    },
    {
        id: 'culture',
        name: 'Culture',
        slug: 'Culture',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&q=80',
        glowColor: '#EC4899'
    },
    {
        id: 'tech',
        name: 'Tech',
        slug: 'Tech',
        image: '/category-tech.png',
        glowColor: '#8B5CF6'
    },
    {
        id: 'ai',
        name: 'AI',
        slug: 'AI',
        image: '/category-ai-v2.png',
        glowColor: '#06B6D4'
    },
    {
        id: 'science',
        name: 'Science',
        slug: 'Science',
        image: '/category-science.png',
        glowColor: '#14B8A6'
    },
    {
        id: 'finance',
        name: 'Finance',
        slug: 'Finance',
        image: '/category-finance.png',
        glowColor: '#22C55E'
    },
    {
        id: 'gaming',
        name: 'Gaming',
        slug: 'Gaming',
        image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=600&q=80',
        glowColor: '#A855F7'
    }
];

export default function CategoryMegaMenu() {
    const { setActiveCategory, setActiveSubcategory, activeCategory } = useCategory();
    const router = useRouter();

    const handleCategoryClick = (category: Category) => {
        setActiveCategory(category.slug);
        setActiveSubcategory('');
        router.push('/markets');
    };

    const handleSubcategoryClick = (categorySlug: string, subcategory: string) => {
        setActiveCategory(categorySlug);
        setActiveSubcategory(subcategory);
        router.push('/markets');
    };

    return (
        <div className="relative">
            {/* Trigger Bar - Compact Category Pills */}
            <div className="flex items-center justify-center flex-wrap gap-4 md:gap-6 py-4 px-6 md:px-12 lg:px-20 border-t border-white/5 bg-transparent">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat)}
                        className={`
                            text-[12px] md:text-[13px] font-black uppercase tracking-[0.1em] whitespace-nowrap
                            transition-all duration-300
                            ${activeCategory === cat.slug
                                ? 'text-[#F492B7]'
                                : 'text-gray-500 hover:text-white'
                            }
                        `}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>
        </div>
    );
}
