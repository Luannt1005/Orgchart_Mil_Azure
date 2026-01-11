'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { OrgNode } from '@/types/orgchart';

interface ManagerFilterProps {
    nodes: OrgNode[];
    onSelect: (managerId: string | number | null, managerName?: string) => void;
    selectedManagerId: string | number | null;
}

const ManagerFilter: React.FC<ManagerFilterProps> = ({ nodes, onSelect, selectedManagerId }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter potential managers or show suggestions
    const filteredNodes = useMemo(() => {
        if (searchTerm.trim() === '') {
            const suggestedIds = ['50002134', '50000001'];
            const suggestedNames = ['Lee Hon Kay', 'Searl Jeff'];

            const suggestions = nodes.filter(n =>
                suggestedIds.includes(String(n.id).trim()) ||
                suggestedNames.some(name => n.name && n.name.toLowerCase().includes(name.toLowerCase()))
            );

            // If specific suggestions found, return them. Otherwise show nothing (or could show top 5).
            if (suggestions.length > 0) return suggestions;
            return [];
        }
        return nodes.filter(node =>
            node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(node.id).toLowerCase().includes(searchTerm.toLowerCase())
        ).slice(0, 8);
    }, [nodes, searchTerm]);

    const selectedManager = nodes.find(n => n.id === selectedManagerId);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helper to get avatar URL
    const getAvatarUrl = (id: string | number) => `https://raw.githubusercontent.com/Luannt1005/test-images/main/${String(id).trim()}.jpg`;

    // Separate suggestions for outside render
    const suggestedManagers = useMemo(() => {
        const suggestedIds = ['50002134', '50000001'];
        const suggestedNames = ['Lee Hon Kay', 'Searl Jeff'];
        return nodes.filter(n =>
            suggestedIds.includes(String(n.id).trim()) ||
            suggestedNames.some(name => n.name && n.name.toLowerCase().includes(name.toLowerCase()))
        );
    }, [nodes]);

    return (
        <div className="flex items-center gap-2">
            <div className="relative" ref={dropdownRef}>
                <div className="relative group">
                    {/* Selected Avatar Overlay */}
                    {selectedManager && (
                        <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 pointer-events-none">
                            <img
                                src={getAvatarUrl(selectedManager.id)}
                                alt=""
                                className="w-6 h-6 rounded-full object-cover border border-purple-200"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.visibility = 'hidden';
                                }}
                            />
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Search person..."
                        className={`
                            w-44 py-1.5 text-xs font-medium
                            bg-[var(--color-bg-card)] border rounded-lg
                            focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent
                            transition-all duration-200
                            ${selectedManagerId
                                ? 'border-purple-300 bg-purple-50 text-purple-700 pl-9 pr-8' // Padding for avatar + close button
                                : 'border-[var(--color-border-light)] text-body px-3'
                            }
                        `}
                        value={selectedManager ? selectedManager.name : searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (selectedManagerId) onSelect(null);
                            setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onClick={() => setIsOpen(true)}
                    />

                    {selectedManagerId ? (
                        <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-purple-400 hover:text-purple-600 transition-colors p-0.5 rounded-full hover:bg-purple-100"
                            onClick={() => {
                                onSelect(null);
                                setSearchTerm('');
                            }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    ) : (
                        <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    )}
                </div>

                {isOpen && filteredNodes.length > 0 && (
                    <div className="absolute z-50 w-56 mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto left-0">
                        {filteredNodes.map((node) => (
                            <button
                                key={node.id}
                                className="w-full text-left px-3 py-2 hover:bg-purple-50 flex items-center gap-2 transition-colors border-b border-gray-50 last:border-0"
                                onClick={() => {
                                    onSelect(node.id, node.name);
                                    setSearchTerm('');
                                    setIsOpen(false);
                                }}
                            >
                                <img
                                    src={getAvatarUrl(node.id)}
                                    alt={node.name}
                                    className="w-6 h-6 rounded-full object-cover bg-purple-100 shrink-0"
                                    onError={(e) => {
                                        const initials = node.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                        (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect fill='%23F3E8FF' width='24' height='24'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%237E22CE' font-weight='bold'%3E${initials}%3C/text%3E%3C/svg%3E`;
                                    }}
                                />
                                <div className="flex flex-col min-w-0">
                                    <span className="text-xs font-semibold text-title truncate">{node.name}</span>
                                    <span className="text-[9px] text-muted truncate">{node.title}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Quick Access Suggestions (Outside) */}
            {!selectedManagerId && suggestedManagers.length > 0 && (
                <div className="flex items-center gap-2">
                    {suggestedManagers.map(manager => (
                        <button
                            key={manager.id}
                            onClick={() => onSelect(manager.id, manager.name)}
                            className="group flex items-center gap-1.5 pl-1 pr-2.5 py-1 bg-[var(--color-bg-card)] border border-[var(--color-border-light)] hover:border-purple-300 hover:bg-purple-50 rounded-full transition-all shadow-sm"
                            title={manager.title}
                        >
                            <img
                                src={getAvatarUrl(manager.id)}
                                alt={manager.name}
                                className="w-6 h-6 rounded-full object-cover border border-gray-100 group-hover:border-purple-200"
                                onError={(e) => {
                                    const initials = manager.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                                    (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect fill='%23F3E8FF' width='24' height='24'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='10' fill='%237E22CE' font-weight='bold'%3E${initials}%3C/text%3E%3C/svg%3E`;
                                }}
                            />
                            <span className="text-[10px] font-semibold text-gray-600 group-hover:text-purple-700 truncate max-w-[80px]">
                                {manager.name.split(' ').slice(0, 2).join(' ')}
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ManagerFilter;
