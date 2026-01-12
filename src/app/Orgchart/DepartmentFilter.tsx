import React, { useState, useRef, useEffect, useMemo } from 'react';

interface DepartmentFilterProps {
    currentSector: string;
    currentType: string;
    groups: any[]; // Using any[] to match the mixed type in groups, but we filter to strings
    loading: boolean;
    hasNodes: boolean;
    onSelect: (sector: string) => void;
    onSelectType: (type: string) => void;
}

export default function DepartmentFilter({
    currentSector,
    currentType,
    groups,
    loading,
    hasNodes,
    onSelect,
    onSelectType
}: DepartmentFilterProps) {
    const [activeDropdown, setActiveDropdown] = useState<'dept' | 'type' | null>(null);
    const [sectorQuery, setSectorQuery] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter valid groups
    const sectorRegistry = useMemo(() => {
        return (groups || []).filter((g): g is string => typeof g === 'string' && g.trim() !== '');
    }, [groups]);

    const typeOptions = ['Staff', 'IDL'];

    // Handle clicking outside to close
    useEffect(() => {
        const handleOutsideInteraction = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener("mousedown", handleOutsideInteraction);
        return () => document.removeEventListener("mousedown", handleOutsideInteraction);
    }, []);

    // Helper for selection
    const handleSelect = (sector: string) => {
        setActiveDropdown(null);
        onSelect(sector);
    };

    const handleTypeToggle = (type: string) => {
        if (type === 'all') {
            onSelectType('all');
            setActiveDropdown(null);
            return;
        }

        const current = currentType === 'all' ? [] : currentType.split(',');
        let next: string[] = [];
        if (current.includes(type)) {
            next = current.filter(t => t !== type);
        } else {
            next = [...current, type];
        }

        if (next.length === 0) {
            onSelectType('all');
        } else {
            onSelectType(next.join(','));
        }
    };

    // Filter list based on search
    const filteredSectors = sectorRegistry.filter(s =>
        s.toLowerCase().includes(sectorQuery.toLowerCase())
    );

    const selectedTypeCount = currentType === 'all' ? 0 : currentType.split(',').length;

    return (
        <div className="w-full bg-[var(--color-bg-card)]/95 backdrop-blur-md border-b border-[var(--color-border-light)] top-0 z-50">
            <div className="px-4 py-2">
                <div className="relative w-full" ref={dropdownRef}>
                    <div className="space-y-1">
                        <div className="flex items-center justify-between px-1">
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">
                                Filters
                            </label>
                        </div>

                        <div className="flex gap-2">
                            {/* Department Filter */}
                            <div className="relative flex-1 min-w-[200px] max-w-sm">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'dept' ? null : 'dept')}
                                    className={`flex items-center justify-between w-full px-3 py-2 bg-[var(--color-bg-page)] border transition-all duration-200 group rounded-lg ${activeDropdown === 'dept'
                                        ? 'border-[#DB011C] bg-[var(--color-bg-card)] ring-2 ring-[#DB011C]/5'
                                        : 'border-[var(--color-border-light)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-card)]'
                                        }`}
                                >
                                    <div className="flex items-center gap-2 truncate overflow-hidden">
                                        <div className={`w-1.5 h-1.5 rounded-full ${currentSector === "all" ? 'bg-gray-400' : 'bg-[#DB011C]'}`}></div>
                                        <span className={`text-sm font-bold tracking-tight truncate ${currentSector === "all" ? 'text-[var(--color-text-title)]' : 'text-[var(--color-text-title)]'}`}>
                                            {currentSector === "all" ? "All Departments" : currentSector}
                                        </span>
                                    </div>
                                    <svg className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'dept' ? 'rotate-180 text-[#DB011C]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {activeDropdown === 'dept' && (
                                    <div className="absolute top-full left-0 mt-1 w-full bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-xl shadow-lg z-50 overflow-hidden">
                                        <div className="p-2 bg-[var(--color-bg-card)] border-b border-[var(--color-border-light)]">
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={sectorQuery}
                                                onChange={(e) => setSectorQuery(e.target.value)}
                                                autoFocus
                                                className="w-full bg-[var(--color-bg-page)] border border-[var(--color-border-light)] px-3 py-1.5 text-xs text-[var(--color-text-body)] rounded-md focus:outline-none focus:border-[#DB011C] focus:bg-[var(--color-bg-card)] placeholder:text-[var(--color-text-muted)]"
                                            />
                                        </div>
                                        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                                            <button onClick={() => handleSelect("all")} className={`w-full px-4 py-2 text-left text-xs font-semibold flex justify-between ${currentSector === "all" ? "bg-red-50 text-[#DB011C]" : "text-[var(--color-text-body)] hover:bg-[var(--color-bg-page)]"}`}>
                                                <span>All Departments</span>
                                                {currentSector === "all" && <div className="w-1.5 h-1.5 rounded-full bg-[#DB011C]"></div>}
                                            </button>
                                            {filteredSectors.map((sector) => (
                                                <button key={sector} onClick={() => handleSelect(sector)} className={`w-full px-4 py-2 text-left text-xs font-semibold flex justify-between border-t border-[var(--color-border-light)] ${currentSector === sector ? "bg-red-50 text-[#DB011C]" : "text-[var(--color-text-body)] hover:bg-[var(--color-bg-page)]"}`}>
                                                    <span className="truncate pr-4">{sector}</span>
                                                    {currentSector === sector && <div className="w-1.5 h-1.5 rounded-full bg-[#DB011C]"></div>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Type Filter */}
                            <div className="relative w-40">
                                <button
                                    onClick={() => setActiveDropdown(activeDropdown === 'type' ? null : 'type')}
                                    className={`flex items-center justify-between w-full px-3 py-2 bg-[var(--color-bg-page)] border transition-all duration-200 group rounded-lg ${activeDropdown === 'type'
                                        ? 'border-[#DB011C] bg-[var(--color-bg-card)] ring-2 ring-[#DB011C]/5'
                                        : 'border-[var(--color-border-light)] hover:border-[var(--color-border)] hover:bg-[var(--color-bg-card)]'
                                        }`}
                                >
                                    <span className="text-sm font-bold text-[var(--color-text-title)] tracking-tight truncate">
                                        {currentType === "all"
                                            ? "All Types"
                                            : selectedTypeCount > 1
                                                ? `${selectedTypeCount} Selected`
                                                : currentType}
                                    </span>
                                    <svg className={`w-4 h-4 transition-transform duration-300 ${activeDropdown === 'type' ? 'rotate-180 text-[#DB011C]' : 'text-gray-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {activeDropdown === 'type' && (
                                    <div className="absolute top-full left-0 mt-1 w-full bg-[var(--color-bg-card)] border border-[var(--color-border-light)] rounded-xl shadow-lg z-50 overflow-hidden">
                                        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar">
                                            <button onClick={() => handleTypeToggle("all")} className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center justify-between ${currentType === "all" ? "bg-red-50 text-[#DB011C]" : "text-[var(--color-text-body)] hover:bg-[var(--color-bg-page)]"}`}>
                                                <span>All Types</span>
                                                {currentType === "all" && <div className="w-1.5 h-1.5 rounded-full bg-[#DB011C]"></div>}
                                            </button>
                                            {typeOptions.map((type) => {
                                                const isSelected = currentType.split(',').includes(type);
                                                return (
                                                    <button key={type} onClick={() => handleTypeToggle(type)} className={`w-full px-4 py-2 text-left text-xs font-semibold flex items-center justify-between border-t border-[var(--color-border-light)] ${isSelected ? "bg-red-50 text-[#DB011C]" : "text-[var(--color-text-body)] hover:bg-[var(--color-bg-page)]"}`}>
                                                        <span>{type}</span>
                                                        <div className={`w-4 h-4 border rounded flex items-center justify-center transition-colors ${isSelected ? 'bg-[#DB011C] border-[#DB011C]' : 'border-[var(--color-border)]'}`}>
                                                            {isSelected && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
