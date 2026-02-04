'use client';

import DashboardContainer from './components/DashboardContainer';
import React, { useState, useMemo } from 'react';
import EmployeeTable from './components/Emp_table';
import PaginatedEmployeeTable from './components/PaginatedEmpTable';
import StatsCards from './components/Multi_card';
import SeniorityChart from './components/Column_chart_seniority';
import DonutChart from './components/Donutchart_byType';
import BUOrg3Chart from './components/bar_chart_BU_Org_3';
import UpcomingResignTable from './components/upcoming_resign_table';
import ManagerFilter from './components/ManagerFilter';
import TitleFilter from './components/TitleFilter';
import BUFilter from './components/BUFilter';
import { useSheetData, getSubordinatesRecursive } from '@/hooks/useSheetData';


export interface EmployeeFilter {
    // Retain compatibility for single-value updates, but state will hold all
    type: 'all' | 'staff' | 'idl' | 'title' | 'tenure' | 'type' | 'bu_org_3';
    value?: string;
    label?: string;
}

// New state interface for multiple active filters
interface FilterState {
    title: string | null;
    bu: string | null;
    category: 'staff' | 'idl' | null;     // mapped from 'staff' | 'idl' types
    employeeType: string | null;          // mapped from 'type' (DL/IDL/Staff custom filter)
    tenure: string | null;
}

export default function DashboardPage() {
    const { nodes, loading: nodesLoading } = useSheetData();

    // Combined filter state
    const [filters, setFilters] = useState<FilterState>({
        title: null,
        bu: null,
        category: null,
        employeeType: null,
        tenure: null
    });

    const [selectedManagerId, setSelectedManagerId] = useState<string | number | null>(null);
    const [selectedManagerName, setSelectedManagerName] = useState<string>('');

    // Legacy handler for compatibility with child components that emit {type, value}
    const handleFilterChange = (filter: EmployeeFilter) => {
        setFilters(prev => {
            const newState = { ...prev };

            if (filter.type === 'all') {
                return { title: null, bu: null, category: null, employeeType: null, tenure: null };
            }

            // Map the discriminatory union "type" to specific state fields
            if (filter.type === 'title') newState.title = filter.value || null;
            if (filter.type === 'bu_org_3') newState.bu = filter.value || null;
            if (filter.type === 'staff') newState.category = 'staff';
            if (filter.type === 'idl') newState.category = 'idl';
            if (filter.type === 'type') newState.employeeType = filter.value || null;
            if (filter.type === 'tenure') newState.tenure = filter.value || null;

            return newState;
        });
    };

    const clearAllFilters = () => {
        setFilters({ title: null, bu: null, category: null, employeeType: null, tenure: null });
    };

    const handleManagerSelect = (id: string | number | null, name?: string) => {
        setSelectedManagerId(id);
        setSelectedManagerName(name || '');
        // Ideally we might want to keep filters when changing managers, 
        // but typically a hierarchy change might reset context. 
        // Keeping filters improves UX for drilling down with same criteria.
        // Let's NOT clear filters here unless requested.
        // clearAllFilters(); 
    };

    const clearManagerFilter = () => {
        setSelectedManagerId(null);
        setSelectedManagerName('');
    };

    const handleTitleSelect = (title: string | null) => {
        setFilters(prev => ({ ...prev, title }));
    };

    const handleBUSelect = (bu: string | null) => {
        setFilters(prev => ({ ...prev, bu }));
    };

    const clearIndividualFilter = (key: keyof FilterState) => {
        setFilters(prev => ({ ...prev, [key]: null }));
    };

    // Calculate hierarchical nodes - always returns an array
    const dashboardNodes = useMemo(() => {
        if (!nodes || nodes.length === 0) {
            return [];
        }
        if (!selectedManagerId) {
            return nodes;
        }
        const subordinates = getSubordinatesRecursive(nodes, selectedManagerId);
        return subordinates;
    }, [nodes, selectedManagerId]);

    // Calculate filtered nodes for charts (Applying ALL active filters)
    const filteredDashboardNodes = useMemo(() => {
        let current = dashboardNodes;

        // 1. Title Filter
        if (filters.title) {
            const keywords = filters.title.toLowerCase().split(" ");
            current = current.filter((node: any) => {
                const title = (node['Job Title'] || node.title || '').toLowerCase();
                return keywords.every((k: string) => title.includes(k));
            });
        }

        // 2. BU Filter
        if (filters.bu) {
            current = current.filter((node: any) => {
                const nodeBU = (node['BU Org 3'] || node.bu_org_3 || '').toLowerCase();
                return nodeBU === filters.bu?.toLowerCase();
            });
        }

        // 3. Category Filter (Staff/IDL quick buttons)
        if (filters.category) {
            const cat = filters.category.toLowerCase();
            current = current.filter((n: any) => (n['DL/IDL/Staff'] || '').toLowerCase().includes(cat));
        }

        // 4. Employee Type Filter (from Donut charts etc)
        if (filters.employeeType) {
            const typeValue = filters.employeeType.toLowerCase();
            current = current.filter((node: any) => {
                const dlIdlStaff = (node['DL/IDL/Staff'] || '').toLowerCase();
                if (typeValue === 'staff') return dlIdlStaff.includes('staff');
                if (typeValue === 'idl') return dlIdlStaff.includes('idl');
                if (typeValue === 'dl') return !dlIdlStaff.includes('staff') && !dlIdlStaff.includes('idl');
                return true;
            });
        }

        // 5. Tenure (if applied here, though mostly in table)
        if (filters.tenure) {
            // Add tenure logic if needed globally for charts
        }

        return current;
    }, [dashboardNodes, filters]);

    // Helper to calculate active filter count or check if specific filters are active
    const hasActiveFilters = Object.values(filters).some(v => v !== null);

    // Construct simplified activeFilter object for child components that expect the old interface
    // (This is a bit loose, as child components imply single filter, but we are just passing state down)
    const legacyActiveFilterState: EmployeeFilter = {
        type: filters.title ? 'title' : filters.bu ? 'bu_org_3' : filters.category === 'staff' ? 'staff' : filters.category === 'idl' ? 'idl' : 'all',
        value: filters.title || filters.bu || undefined,
        label: filters.title || filters.bu || undefined
    };

    return (
        /* ===== PAGE WRAPPER - 100vh NO SCROLL ===== */
        <DashboardContainer className="pt-0">

            {/* ===== HEADER BAR (40px) ===== */}
            <header className="h-20 shrink-0 layout-header px-5 flex items-center justify-between">
                {/* Left: Title */}

                <div>
                    <h1 className="text-[22px] font-bold text-title leading-tight">
                        HR Dashboard
                    </h1>
                    <p className="text-[11px] text-muted mt-0.5">
                        Organization metrics overview
                    </p>
                </div>

                {/* Right: Filters & Actions */}
                <div className="flex items-center gap-4">
                    {/* Active Filters Badges */}
                    <div className="flex items-center gap-2 flex-wrap justify-end max-w-xl">

                        {/* Manager Badge */}
                        {selectedManagerId && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span className="max-w-[120px] truncate">{selectedManagerName}</span>
                                <button onClick={clearManagerFilter} className="hover:text-purple-900 p-0.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Title Badge Using Filter State */}
                        {filters.title && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                                <span>Title: {filters.title}</span>
                                <button onClick={() => clearIndividualFilter('title')} className="hover:text-blue-900 p-0.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* BU Badge */}
                        {filters.bu && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium">
                                <span>BU: {filters.bu}</span>
                                <button onClick={() => clearIndividualFilter('bu')} className="hover:text-emerald-900 p-0.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Other Category Badges */}
                        {filters.category && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-lg text-xs font-medium">
                                <span className="uppercase">{filters.category}</span>
                                <button onClick={() => clearIndividualFilter('category')} className="hover:text-orange-900 p-0.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        )}

                        {/* Clear All Button */}
                        {hasActiveFilters && (
                            <button onClick={clearAllFilters} className="text-[10px] uppercase font-bold text-gray-400 hover:text-gray-600 transition-colors">
                                Clear All
                            </button>
                        )}
                    </div>

                    <div className="h-6 w-px bg-gray-200"></div>

                    {/* Filters */}
                    <div className="flex items-center gap-3">
                        {/* Title Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Title:</span>
                            <TitleFilter
                                nodes={dashboardNodes} // Pass available nodes in current hierarchy
                                onSelect={handleTitleSelect}
                                selectedTitle={filters.title}
                            />
                        </div>

                        {/* BU Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">BU:</span>
                            <BUFilter
                                nodes={dashboardNodes}
                                onSelect={handleBUSelect}
                                selectedBU={filters.bu}
                            />
                        </div>

                        {/* Manager Filter */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Hierarchy:</span>
                            <ManagerFilter
                                nodes={nodes}
                                onSelect={handleManagerSelect}
                                selectedManagerId={selectedManagerId}
                            />
                        </div>
                    </div>
                </div>
            </header>

            {/* ===== MAIN CONTENT (fills remaining height) ===== */}
            <main className="flex-1 layout-background min-h-0 p-2 pb-1 overflow-y-auto bg-[var(--color-bg-page)]">
                <div className="h-full grid grid-cols-1 lg:grid-cols-12 gap-2 auto-rows-min lg:auto-rows-auto">

                    {/* ===== LEFT COLUMN (7 cols) ===== */}
                    <div className="lg:col-span-7 flex flex-col gap-2 min-h-0">

                        {/* Row 1: KPI Cards (fixed height) */}
                        <div className="shrink-0 min-h-[74px]">
                            <StatsCards
                                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-3"
                                onFilterChange={handleFilterChange}
                                activeFilter={legacyActiveFilterState}
                                nodes={dashboardNodes} // Keep using dashboardNodes to show overview stats
                                loading={nodesLoading}
                                isFiltered={!!selectedManagerId || hasActiveFilters}
                            />
                        </div>

                        {/* Row 2: Charts (Donut + Seniority) */}
                        <div className="lg:flex-[0.4] grid grid-cols-1 sm:grid-cols-2 gap-2 h-[300px] lg:h-0 min-h-[220px]">
                            <DonutChart
                                onFilterChange={handleFilterChange}
                                nodes={filteredDashboardNodes} // Apply filters
                                loading={nodesLoading}
                            />
                            <SeniorityChart
                                onFilterChange={handleFilterChange}
                                nodes={filteredDashboardNodes} // Apply filters
                                loading={nodesLoading}
                            />
                        </div>

                        {/* Row 3: BU Org Chart */}
                        <div className="lg:flex-[0.6] h-[300px] lg:h-0 min-h-[220px]">
                            <BUOrg3Chart
                                nodes={filteredDashboardNodes} // Apply filters
                                loading={nodesLoading}
                            />
                        </div>
                    </div>

                    {/* ===== RIGHT COLUMN (5 cols) ===== */}
                    <div className="lg:col-span-5 flex flex-col gap-2 min-h-0 h-full">

                        {/* Employee Table (main) */}
                        <div className="flex-[2] min-h-[400px] lg:min-h-0 bg-white dark:bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-gray-100 dark:border-[var(--color-border-light)] flex flex-col overflow-hidden">
                            <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
                                <h2 className="text-[13px] font-bold text-title">
                                    Employee Roster
                                </h2>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {(!selectedManagerId && !hasActiveFilters)
                                        ? 'Server-side pagination'
                                        : `${filteredDashboardNodes?.length || 0} total`}
                                </span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                {/* Use server-side pagination when no filters applied */}
                                {!selectedManagerId && !hasActiveFilters ? (
                                    <PaginatedEmployeeTable
                                        pageSize={10}
                                        className="h-full"
                                    />
                                ) : (
                                    <EmployeeTable
                                        filter={legacyActiveFilterState}
                                        nodes={filteredDashboardNodes} // Use filtered nodes for consistency
                                        loading={nodesLoading}
                                        className="h-full"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Upcoming Resignations */}
                        <div className="flex-[1] min-h-[250px] lg:min-h-0 bg-white dark:bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-gray-100 dark:border-[var(--color-border-light)] flex flex-col overflow-hidden">
                            <div className="px-4 pt-3 pb-2 shrink-0">
                                <h2 className="text-[13px] pl-1 font-bold text-title">
                                    Upcoming Resignations
                                </h2>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                <UpcomingResignTable
                                    nodes={filteredDashboardNodes} // Apply filters
                                    loading={nodesLoading}
                                    className="h-full"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </DashboardContainer>
    );
}
