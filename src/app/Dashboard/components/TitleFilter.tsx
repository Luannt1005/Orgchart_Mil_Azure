'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OrgNode } from '@/types/orgchart';

interface TitleFilterProps {
    nodes: OrgNode[];
    onSelect: (title: string | null) => void;
    selectedTitle: string | null;
}

// Predefined general job categories matching the logic in StatsCards
const JOB_CATEGORIES = [
    { label: 'Operator', value: 'operator' },
    { label: 'Technician', value: 'technician' },
    { label: 'Specialist', value: 'specialist' },
    { label: 'Supervisor', value: 'supervisor' },
    { label: 'Engineer', value: 'engineer' },
    { label: 'Manager', value: 'manager' },
    { label: 'Coordinator', value: 'coordinator' },
    { label: 'Director', value: 'director' },
    { label: 'Shift Leader', value: 'shift leader' },
    { label: 'Line Leader', value: 'line leader' },
    { label: 'WH Keeper', value: 'warehouse keeper' },
    { label: 'Trainee', value: 'trainee' },
];

const TitleFilter: React.FC<TitleFilterProps> = ({ nodes, onSelect, selectedTitle }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter categories that have at least one match in the current data
    const availableCategories = useMemo(() => {
        return JOB_CATEGORIES.filter(cat => {
            const keywords = cat.value.split(" ");
            return nodes.some(node => {
                const title = (node['Job Title'] || node.title || '').toLowerCase();
                return keywords.every(k => title.includes(k));
            });
        });
    }, [nodes]);

    // Filter dropdown options based on user search
    const filteredCategories = useMemo(() => {
        if (!searchTerm) return availableCategories;
        const lowerTerm = searchTerm.toLowerCase();
        return availableCategories.filter(cat => cat.label.toLowerCase().includes(lowerTerm));
    }, [availableCategories, searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle input change
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        if (selectedTitle) {
            onSelect(null); // Clear selection when user starts typing new search
        }
        setIsOpen(true);
    };

    const handleSelect = (cat: { label: string, value: string }) => {
        onSelect(cat.value); // Pass the simple value (keyword) to the parent filter logic
        setSearchTerm('');
        setIsOpen(false);
    };

    const handleClear = () => {
        onSelect(null);
        setSearchTerm('');
    };

    // Determine display value: Show label if selected, otherwise search term
    const selectedLabel = JOB_CATEGORIES.find(c => c.value === selectedTitle)?.label || selectedTitle;
    const displayValue = selectedLabel || searchTerm;

    return (
        <div className="relative" ref={dropdownRef}>
            <div className="relative group">
                <input
                    type="text"
                    placeholder="Search roles..."
                    className={`
                        w-48 py-1.5 text-xs font-medium
                        bg-white border rounded-lg
                        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent
                        transition-all duration-200
                        ${selectedTitle
                            ? 'border-blue-300 bg-blue-50 text-blue-700 pl-3 pr-8'
                            : 'border-gray-200 text-gray-700 px-3'
                        }
                    `}
                    value={displayValue || ''}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    onClick={() => setIsOpen(true)}
                />

                {selectedTitle ? (
                    <button
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-blue-400 hover:text-blue-600 transition-colors p-0.5 rounded-full hover:bg-blue-100"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleClear();
                        }}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                ) : (
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                )}
            </div>

            {isOpen && (
                <div className="absolute z-50 w-48 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                    {filteredCategories.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-gray-400">No matching roles</div>
                    ) : (
                        filteredCategories.map((cat) => (
                            <button
                                key={cat.value}
                                className={`w-full text-left px-3 py-2 hover:bg-blue-50 flex items-center justify-between transition-colors border-b border-gray-50 last:border-0 text-xs font-medium ${selectedTitle === cat.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                                    }`}
                                onClick={() => handleSelect(cat)}
                            >
                                <span>{cat.label}</span>
                                {selectedTitle === cat.value && (
                                    <svg className="w-3 h-3 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

export default TitleFilter;
