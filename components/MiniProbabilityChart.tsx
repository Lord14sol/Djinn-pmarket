"use client";
import React from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { getOutcomeColor } from "@/lib/market-colors";

interface MiniProbabilityChartProps {
    data: any[];
    outcomes: (string | { id: string; title: string })[];
}

export default function MiniProbabilityChart({ data, outcomes }: MiniProbabilityChartProps) {
    const outcomeKeys = outcomes.map(o => typeof o === "string" ? o : o.title);

    // Safety check for data
    const safeData = data.length > 0 ? data : [
        { time: Date.now() / 1000 - 3600, YES: 50, NO: 50 },
        { time: Date.now() / 1000, YES: 50, NO: 50 }
    ];

    return (
        <div className="w-full h-full min-h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={safeData}>
                    <XAxis dataKey="time" hide />
                    <YAxis domain={[0, 100]} hide />
                    {outcomeKeys.map((key, idx) => (
                        <Line
                            key={key}
                            type="monotone"
                            dataKey={key}
                            stroke={getOutcomeColor(key, idx)}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={false}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
