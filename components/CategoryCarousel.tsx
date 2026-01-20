"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Category {
    id: string;
    name: string;
    slug: string;
    image: string;
    glowColor?: string; // Hex color for glow effect
}

const CATEGORIES: Category[] = [
    {
        id: 'crypto',
        name: 'Crypto Wars',
        slug: 'crypto',
        image: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=800&q=80',
        glowColor: '#10B981' // Mint
    },
    {
        id: 'politics',
        name: 'World Politics',
        slug: 'politics',
        image: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80',
        glowColor: '#EC4899' // Pink
    },
    {
        id: 'sports',
        name: 'Sports Arena',
        slug: 'sports',
        image: 'https://images.unsplash.com/photo-1461896836934- voices889b8ae?w=800&q=80',
        glowColor: '#F59E0B' // Amber
    },
    {
        id: 'pop-culture',
        name: 'Pop Culture',
        slug: 'pop-culture',
        image: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&q=80',
        glowColor: '#8B5CF6' // Purple
    },
    {
        id: 'ai',
        name: 'AI Prophecies',
        slug: 'ai',
        image: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80',
        glowColor: '#06B6D4' // Cyan
    },
    {
        id: 'global',
        name: 'Global Events',
        slug: 'global',
        image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80',
        glowColor: '#10B981' // Mint
    }
];

interface CategoryCardProps {
    category: Category;
    isActive: boolean;
    onClick: () => void;
}

function CategoryCard({ category, isActive, onClick }: CategoryCardProps) {
    return (
        <div
            onClick={onClick}
            className={`
                relative flex-shrink-0 w-64 h-40 rounded-2xl overflow-hidden cursor-pointer
                border-2 transition-all duration-500 ease-out
                ${isActive
                    ? 'scale-105 brightness-110 saturate-100'
                    : 'scale-95 brightness-75 saturate-50 opacity-70 hover:opacity-90 hover:scale-100'
                }
            `}
            style={{
                borderColor: isActive ? category.glowColor : 'transparent',
                boxShadow: isActive ? `0 0 30px ${category.glowColor}40, 0 0 60px ${category.glowColor}20` : 'none'
            }}
        >
            {/* Background Image */}
            <div
                className="absolute inset-0 bg-cover bg-center transition-transform duration-700"
                style={{
                    backgroundImage: `url(${category.image})`,
                    transform: isActive ? 'scale(1.1)' : 'scale(1)'
                }}
            />

            {/* Mystical Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020202] via-[#020202]/40 to-transparent" />

            {/* Animated Glow Ring (Active Only) */}
            {isActive && (
                <div
                    className="absolute inset-0 rounded-2xl animate-pulse"
                    style={{
                        boxShadow: `inset 0 0 20px ${category.glowColor}30`
                    }}
                />
            )}

            {/* Title */}
            <div className="absolute bottom-4 left-4 right-4 z-10">
                <h3
                    className={`
                        text-lg font-bold text-white uppercase tracking-wider
                        transition-all duration-300
                        ${isActive ? 'text-xl' : 'text-lg'}
                    `}
                    style={{
                        textShadow: isActive
                            ? `0 0 20px ${category.glowColor}, 0 2px 4px rgba(0,0,0,0.8)`
                            : '0 2px 4px rgba(0,0,0,0.8)'
                    }}
                >
                    {category.name}
                </h3>
            </div>
        </div>
    );
}

export default function CategoryCarousel() {
    const router = useRouter();
    const scrollRef = useRef<HTMLDivElement>(null);
    const [activeCategory, setActiveCategory] = useState<string>('crypto');

    const handleCategoryClick = (category: Category) => {
        setActiveCategory(category.id);
        // Navigate to category page or filter
        router.push(`/?category=${category.slug}`);
    };

    // Scroll active card into view
    useEffect(() => {
        const activeCard = document.getElementById(`category-${activeCategory}`);
        if (activeCard && scrollRef.current) {
            activeCard.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }
    }, [activeCategory]);

    return (
        <div className="relative w-full py-8">
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6 px-4 md:px-0">
                <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-gray-500">
                    Explore the Bazaar
                </h2>
                <div className="h-px flex-1 ml-6 bg-gradient-to-r from-white/10 to-transparent" />
            </div>

            {/* Carousel Container */}
            <div
                ref={scrollRef}
                className="
                    flex gap-4 overflow-x-auto pb-4 px-4 md:px-0
                    scroll-smooth snap-x snap-mandatory
                    scrollbar-none
                "
                style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                {CATEGORIES.map((category) => (
                    <div
                        key={category.id}
                        id={`category-${category.id}`}
                        className="snap-center"
                    >
                        <CategoryCard
                            category={category}
                            isActive={activeCategory === category.id}
                            onClick={() => handleCategoryClick(category)}
                        />
                    </div>
                ))}
            </div>

            {/* Gradient Fades (Left & Right) */}
            <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-[#020202] to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-[#020202] to-transparent pointer-events-none z-10" />
        </div>
    );
}
