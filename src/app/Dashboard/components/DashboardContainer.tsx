'use client';

import React from 'react';

interface DashboardContainerProps {
    children: React.ReactNode;
    className?: string;
}

export default function DashboardContainer({ children, className = '' }: DashboardContainerProps) {
    return (
        <div
            className={`
                h-screen overflow-hidden flex flex-col 
                layout-background
                ${className}
            `}
            style={{
                backgroundColor: 'var(--color-bg-page)',
                color: 'var(--color-text-body)'
            }}
        >
            {children}
        </div>
    );
}
