'use client';

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';

export interface IconLine {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    opacity?: number;
}

export interface IconDefinition {
    lines: [IconLine, IconLine, IconLine];
    rotation?: number;
    group?: string;
}

const CENTER = 7;
const VIEWBOX_SIZE = 14;

export const collapsed: IconLine = {
    x1: CENTER,
    y1: CENTER,
    x2: CENTER,
    y2: CENTER,
    opacity: 0,
};

// --- ICON REGISTRY ---

const arrowLines: [IconLine, IconLine, IconLine] = [
    { x1: 2, y1: 7, x2: 12, y2: 7 },
    { x1: 7.5, y1: 2.5, x2: 12, y2: 7 },
    { x1: 7.5, y1: 11.5, x2: 12, y2: 7 },
];

const plusLines: [IconLine, IconLine, IconLine] = [
    { x1: 2, y1: 7, x2: 12, y2: 7 },
    { x1: 7, y1: 2, x2: 7, y2: 12 },
    collapsed,
];

const menuLines: [IconLine, IconLine, IconLine] = [
    { x1: 2, y1: 3.5, x2: 12, y2: 3.5 },
    { x1: 2, y1: 7, x2: 12, y2: 7 },
    { x1: 2, y1: 10.5, x2: 12, y2: 10.5 },
];

const closeLines: [IconLine, IconLine, IconLine] = [
    { x1: 3, y1: 3, x2: 11, y2: 11 },
    { x1: 11, y1: 3, x2: 3, y2: 11 },
    collapsed,
];

const checkLines: [IconLine, IconLine, IconLine] = [
    { x1: 2, y1: 7.5, x2: 5.5, y2: 11 },
    { x1: 5.5, y1: 11, x2: 12, y2: 3 },
    collapsed,
];

const activityLines: [IconLine, IconLine, IconLine] = [
    { x1: 2, y1: 8, x2: 5, y2: 8 },
    { x1: 5, y1: 8, x2: 8, y2: 3 },
    { x1: 8, y1: 3, x2: 11, y2: 11 },
];

const leaderboardLines: [IconLine, IconLine, IconLine] = [
    { x1: 3, y1: 12, x2: 3, y2: 7 },
    { x1: 7, y1: 12, x2: 7, y2: 3 },
    { x1: 11, y1: 12, x2: 11, y2: 9 },
];

export const ICONS = {
    'arrow-right': { lines: arrowLines, rotation: 0, group: 'arrow' },
    'arrow-down': { lines: arrowLines, rotation: 90, group: 'arrow' },
    'arrow-left': { lines: arrowLines, rotation: 180, group: 'arrow' },
    'arrow-up': { lines: arrowLines, rotation: -90, group: 'arrow' },
    'plus': { lines: plusLines, rotation: 0, group: 'plus-cross' },
    'cross': { lines: plusLines, rotation: 45, group: 'plus-cross' },
    'menu': { lines: menuLines, rotation: 0 },
    'close': { lines: closeLines, rotation: 0 },
    'check': { lines: checkLines, rotation: 0 },
    'activity': { lines: activityLines, rotation: 0 },
    'leaderboard': { lines: leaderboardLines, rotation: 0 },
};

export type IconType = keyof typeof ICONS;

interface Props {
    type: IconType;
    size?: number;
    color?: string;
    strokeWidth?: number;
    className?: string;
}

export default function MorphingIcon({
    type,
    size = 24,
    color = 'currentColor',
    strokeWidth = 2,
    className = '',
}: Props) {
    const definition = useMemo(() => ICONS[type], [type]);

    const defaultTransition = {
        type: 'spring',
        stiffness: 500,
        damping: 30,
        mass: 1,
    };

    return (
        <motion.svg
            width={size}
            height={size}
            viewBox={`0 0 ${VIEWBOX_SIZE} ${VIEWBOX_SIZE}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className={className}
            initial={false}
            animate={{ rotate: definition.rotation ?? 0 }}
            transition={defaultTransition}
        >
            {definition.lines.map((line, i) => (
                <motion.line
                    key={i}
                    initial={false}
                    animate={{
                        x1: line.x1,
                        y1: line.y1,
                        x2: line.x2,
                        y2: line.y2,
                        opacity: line.opacity ?? 1,
                    }}
                    transition={defaultTransition}
                />
            ))}
        </motion.svg>
    );
}
