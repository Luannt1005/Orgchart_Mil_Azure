'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OrgNode } from '@/types/orgchart';

interface BUFilterProps {
    nodes: OrgNode[];
    onSelect: (bu: string | null) => void;
    selectedBU: string | null;
}

const BUFilter: React.FC<BUFilterProps> = ({ nodes, onSelect, selectedBU }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Dynamic extraction of unique BU Org 3 values from current nodes
    const availableBUs = useMemo(() => {
        const buSet = new Set<string>();
        nodes.forEach(node => {
            const bu = node['BU Org 3'] || node.bu_org_3;
            if (bu) {
                buSet.add(bu);
            }
        });
        return Array.from(buSet).sort();
    }, [nodes]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (bu: string) => {
        onSelect(bu);
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                className={`
                    w-48 py-1.5 px-3 text-xs font-medium text-left
                    bg-[var(--color-bg-card)] border rounded-lg flex items-center justify-between
                    focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                    transition-all duration-200
                    ${selectedBU
                        ? 'border-blue-300 bg-blue-50 text-blue-700'
                        : 'border-[var(--color-border-light)] text-body hover:border-gray-300'
                    }
                `}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className="truncate">{selectedBU || 'Select BU...'}</span>

                {selectedBU ? (
                    <div
                        className="p-0.5 rounded-full hover:bg-blue-200 text-blue-500 hover:text-blue-700 shrink-0"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClear();
                        }}
                    >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                ) : (
                    <svg className={`w-3.5 h-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </button>

            {isOpen && (
                <div className="absolute z-50 w-64 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    {availableBUs.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted">No available BUs</div>
                    ) : (
                        availableBUs.map((bu) => (
                            <button
                                key={bu}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between transition-colors border-b border-[var(--color-border-light)] last:border-0 text-xs font-medium ${selectedBU === bu ? 'bg-blue-50 text-blue-700' : 'text-body'
                                    }`}
                                onClick={() => handleSelect(bu)}
                            >
                                <span className="truncate" title={bu}>{bu}</span>
                                {selectedBU === bu && (
                                    <svg className="w-3 h-3 text-blue-600 shrink-0 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                )}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default BUFilter;
