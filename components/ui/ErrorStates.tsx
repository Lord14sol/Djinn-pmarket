'use client';

import React from 'react';

interface ErrorStateProps {
    title?: string;
    message?: string;
    onRetry?: () => void;
}

// General Error State Component
export function ErrorState({
    title = "Something went wrong",
    message = "We couldn't load this content. Please try again.",
    onRetry
}: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6">
            {/* Error Icon */}
            <div className="relative mb-6">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse" />
            </div>

            <h3 className="text-xl font-black text-white mb-2">{title}</h3>
            <p className="text-gray-500 text-sm text-center max-w-md mb-6">{message}</p>

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-6 py-3 bg-[#F492B7] text-black font-black text-sm rounded-xl hover:scale-105 active:scale-95 transition-transform uppercase tracking-wide"
                >
                    Try Again
                </button>
            )}
        </div>
    );
}

// Empty State Component
export function EmptyState({
    title = "Nothing here yet",
    message = "Be the first to create something!",
    icon = "📭",
    actionLabel,
    onAction
}: {
    title?: string;
    message?: string;
    icon?: string;
    actionLabel?: string;
    onAction?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed border-white/10 rounded-3xl">
            <span className="text-5xl mb-4">{icon}</span>
            <h3 className="text-xl font-black text-white mb-2">{title}</h3>
            <p className="text-gray-500 text-sm text-center max-w-md mb-6">{message}</p>

            {actionLabel && onAction && (
                <button
                    onClick={onAction}
                    className="px-6 py-3 bg-[#F492B7] text-black font-black text-sm rounded-xl hover:scale-105 active:scale-95 transition-transform uppercase tracking-wide"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

// Network Error Toast
export function NetworkErrorToast({ onDismiss }: { onDismiss: () => void }) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-red-500/90 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-2xl border border-red-400/30 animate-slide-up">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
            </svg>
            <span className="text-white font-bold text-sm">No internet connection</span>
            <button onClick={onDismiss} className="ml-2 text-white/70 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

// Success Toast
export function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#10B981]/90 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-2xl border border-[#10B981]/30 animate-slide-up">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-white font-bold text-sm">{message}</span>
            <button onClick={onDismiss} className="ml-2 text-white/70 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
        </div>
    );
}

// 404 Not Found
export function NotFoundState() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center px-6">
            <div className="relative mb-8">
                <img src="/star.png" alt="Djinn" className="w-32 h-32 opacity-30" />
                <span className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/50">?</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-4">404</h1>
            <p className="text-gray-500 text-lg mb-8">This page doesn't exist in our realm</p>
            <a
                href="/"
                className="px-8 py-4 bg-[#F492B7] text-black font-black rounded-xl hover:scale-105 active:scale-95 transition-transform uppercase tracking-wide"
            >
                Back to Home
            </a>
        </div>
    );
}
