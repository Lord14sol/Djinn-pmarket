"use client";
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useCategory } from '@/lib/CategoryContext';

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
    const [isExpanded, setIsExpanded] = useState(false);
    const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setIsExpanded(true);
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsExpanded(false);
            setHoveredCategory(null);
        }, 100);
    };

    const handleCategoryClick = (category: Category) => {
        setActiveCategory(category.slug);
        setActiveSubcategory('');
        setIsExpanded(false);
        router.push('/');
    };

    const handleSubcategoryClick = (categorySlug: string, subcategory: string) => {
        setActiveCategory(categorySlug);
        setActiveSubcategory(subcategory);
        setIsExpanded(false);
        router.push('/');
    };

    return (
        <div
            className="relative"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Trigger Bar - Compact Category Pills */}
            <div className="flex items-center justify-center flex-wrap gap-4 md:gap-6 py-4 px-6 md:px-12 lg:px-20 border-t border-white/5 bg-black/40">
                {CATEGORIES.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat)}
                        onMouseEnter={() => setHoveredCategory(cat.id)}
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

            {/* Mega Menu Dropdown */}
            <div
                className={`
                    absolute left-0 right-0 top-full z-50
                    bg-[#020202] border-b border-white/5
                    transition-all duration-500 ease-out overflow-hidden
                    ${isExpanded ? 'max-h-[700px] opacity-100' : 'max-h-0 opacity-0'}
                `}
            >
                <div className="max-w-[1600px] mx-auto px-6 md:px-12 py-8">
                    {/* Category Cards Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
                        {CATEGORIES.map((category) => (
                            <div
                                key={category.id}
                                className="relative group"
                                onMouseEnter={() => setHoveredCategory(category.id)}
                            >
                                {/* Card */}
                                <button
                                    onClick={() => handleCategoryClick(category)}
                                    className={`
                                        relative w-full aspect-[4/3] rounded-xl overflow-hidden
                                        border-2 transition-all duration-300
                                        ${activeCategory === category.slug
                                            ? 'scale-105 border-[#F492B7]'
                                            : 'border-transparent hover:border-white/20 hover:scale-102'
                                        }
                                    `}
                                    style={{
                                        boxShadow: activeCategory === category.slug
                                            ? `0 0 20px ${category.glowColor}40`
                                            : 'none'
                                    }}
                                >
                                    {/* Image */}
                                    <div
                                        className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                        style={{ backgroundImage: `url(${category.image})` }}
                                    />

                                    {/* Overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

                                    {/* Title */}
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                                            {category.name}
                                        </h3>
                                    </div>

                                    {/* Has Subcategories Indicator */}
                                    {category.subcategories && (
                                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
                                    )}
                                </button>

                                {/* Subcategory Carousel (Earth) */}
                                {category.subcategories && hoveredCategory === category.id && (
                                    <div
                                        className="absolute top-full left-1/2 -translate-x-1/2 mt-3 z-20
                                            bg-[#0A0A0A]/95 backdrop-blur-xl border border-white/10 rounded-2xl p-4
                                            animate-in fade-in slide-in-from-top-2 duration-300
                                            min-w-[450px] shadow-2xl"
                                    >
                                        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                                            {category.subcategories.map((sub) => (
                                                <button
                                                    key={sub.id}
                                                    onClick={() => handleSubcategoryClick(category.slug, sub.name)}
                                                    className="flex-shrink-0 group/sub relative w-[100px] h-[80px] rounded-xl overflow-hidden
                                                        border-2 border-white/10 hover:border-[#F492B7] transition-all duration-300"
                                                >
                                                    {sub.image ? (
                                                        <img
                                                            src={sub.image}
                                                            alt={sub.name}
                                                            className="w-full h-full object-cover group-hover/sub:scale-110 transition-transform duration-500"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-[#06B6D4]/20 to-[#F492B7]/20" />
                                                    )}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[9px] font-bold text-white uppercase tracking-wider text-center truncate">
                                                        {sub.name}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
