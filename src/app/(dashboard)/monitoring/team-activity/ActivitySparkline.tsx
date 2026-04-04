"use client";

import React from 'react';

interface ActivitySparklineProps {
    data: number[];
    color: string;
    width?: number;
    height?: number;
}

export default function ActivitySparkline({ data, color, width = 60, height = 24 }: ActivitySparklineProps) {
    if (!data || data.length < 2) return <div className="text-xs text-gray-300">--</div>;

    const max = Math.max(...data, 10); // Min scale of 10 for visibility
    const padding = 2;
    
    // Calculate points for the SVG polyline
    const points = data.map((val, i) => {
        const x = (i / (data.length - 1)) * (width - 2 * padding) + padding;
        const y = height - ((val / max) * (height - 2 * padding) + padding);
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width={width} height={height} className="overflow-visible">
            <path
                d={`M ${points}`}
                fill="none"
                stroke={color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500"
            />
            {/* Hover circle for latest point */}
            <circle 
                cx={(data.length - 1) / (data.length - 1) * (width - 2 * padding) + padding} 
                cy={height - ((data[data.length - 1] / max) * (height - 2 * padding) + padding)} 
                r="2" 
                fill={color} 
            />
        </svg>
    );
}
