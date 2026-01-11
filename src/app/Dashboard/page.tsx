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
import { useSheetData, getSubordinatesRecursive } from '@/hooks/useSheetData';
import './design-tokens.css';

export interface EmployeeFilter {
    type: 'all' | 'staff' | 'idl' | 'title' | 'tenure' | 'type';
    value?: string;
    label?: string;
}

export default function DashboardPage() {
    const { nodes, loading: nodesLoading } = useSheetData();
    const [activeFilter, setActiveFilter] = useState<EmployeeFilter>({ type: 'all' });
    const [selectedManagerId, setSelectedManagerId] = useState<string | number | null>(null);
    const [selectedManagerName, setSelectedManagerName] = useState<string>('');

    const handleFilterChange = (filter: EmployeeFilter) => {
        setActiveFilter(filter);
    };

    const clearFilter = () => {
        setActiveFilter({ type: 'all' });
    };

    const handleManagerSelect = (id: string | number | null, name?: string) => {
        setSelectedManagerId(id);
        setSelectedManagerName(name || '');
        setActiveFilter({ type: 'all' });
    };

    const clearManagerFilter = () => {
        setSelectedManagerId(null);
        setSelectedManagerName('');
    };

    const handleTitleSelect = (title: string | null) => {
        if (title) {
            setActiveFilter({ type: 'title', value: title, label: title });
        } else {
            setActiveFilter({ type: 'all' });
        }
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
        // User requested to NOT include the manager themself in the count/list when filtering by manager
        return subordinates;
    }, [nodes, selectedManagerId]);

    // Calculate filtered nodes for charts
    const filteredDashboardNodes = useMemo(() => {
        let current = dashboardNodes;

        if (activeFilter.type === 'title' && activeFilter.value) {
            const keywords = activeFilter.value.toLowerCase().split(" ");
            current = current.filter((node: any) => {
                const title = (node['Job Title'] || node.title || '').toLowerCase();
                return keywords.every((k: string) => title.includes(k));
            });
        } else if (activeFilter.type === 'staff') {
            current = current.filter((n: any) => (n['DL/IDL/Staff'] || '').toLowerCase().includes('staff'));
        } else if (activeFilter.type === 'idl') {
            current = current.filter((n: any) => (n['DL/IDL/Staff'] || '').toLowerCase().includes('idl'));
        } else if (activeFilter.type === 'type' && activeFilter.value) {
            const typeValue = activeFilter.value.toLowerCase();
            current = current.filter((node: any) => {
                const dlIdlStaff = (node['DL/IDL/Staff'] || '').toLowerCase();
                if (typeValue === 'staff') return dlIdlStaff.includes('staff');
                if (typeValue === 'idl') return dlIdlStaff.includes('idl');
                if (typeValue === 'dl') return !dlIdlStaff.includes('staff') && !dlIdlStaff.includes('idl');
                return true;
            });
        }

        // Note: Tenure filter is quite complex and handled in EmployeeTable. 
        // For now, we skip reapplying tenure filter to charts to avoid code duplication and performance hit,
        // unless strictly required. The user request focused on 'Title' filter.

        return current;
    }, [dashboardNodes, activeFilter]);

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
                    <div className="flex items-center gap-2">
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
                        {activeFilter.type !== 'all' && (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                                </svg>
                                <span className="max-w-[100px] truncate">{activeFilter.label || activeFilter.value}</span>
                                <button onClick={clearFilter} className="hover:text-blue-900 p-0.5">
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
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
                                selectedTitle={activeFilter.type === 'title' ? activeFilter.value || null : null}
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
            <main className="flex-1 layout-background min-h-0 p-2">
                <div className="h-full grid grid-cols-12 gap-4">

                    {/* ===== LEFT COLUMN (7 cols) ===== */}
                    <div className="col-span-7 flex flex-col gap-4 min-h-0">

                        {/* Row 1: KPI Cards (fixed height) */}
                        <div className="shrink-0 min-h-[74px]">
                            <StatsCards
                                className="grid grid-cols-6 gap-3"
                                onFilterChange={handleFilterChange}
                                activeFilter={activeFilter}
                                nodes={dashboardNodes} // Keep using dashboardNodes to show overview stats
                                loading={nodesLoading}
                                isFiltered={!!selectedManagerId || activeFilter.type !== 'all'}
                            />
                        </div>

                        {/* Row 2: Charts (Donut + Seniority) */}
                        <div className="flex-[0.4] grid grid-cols-2 gap-4">
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
                        <div className="flex-[0.6]">
                            <BUOrg3Chart
                                nodes={filteredDashboardNodes} // Apply filters
                                loading={nodesLoading}
                            />
                        </div>
                    </div>

                    {/* ===== RIGHT COLUMN (5 cols) ===== */}
                    <div className="col-span-5 flex flex-col gap-4 min-h-0 h-full">

                        {/* Employee Table (main) */}
                        <div className="flex-[2] min-h-0 bg-white dark:bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-gray-100 dark:border-[var(--color-border-light)] flex flex-col overflow-hidden">
                            <div className="px-4 pt-3 pb-2 shrink-0 flex items-center justify-between">
                                <h2 className="text-[13px] font-bold text-title">
                                    Employee Roster
                                </h2>
                                <span className="text-[10px] text-gray-400 font-medium">
                                    {(!selectedManagerId && activeFilter.type === 'all')
                                        ? 'Server-side pagination'
                                        : `${filteredDashboardNodes?.length || 0} total`}
                                </span>
                            </div>
                            <div className="flex-1 min-h-0 overflow-hidden">
                                {/* Use server-side pagination when no filters applied */}
                                {!selectedManagerId && activeFilter.type === 'all' ? (
                                    <PaginatedEmployeeTable
                                        pageSize={10}
                                        className="h-full"
                                    />
                                ) : (
                                    <EmployeeTable
                                        filter={activeFilter}
                                        nodes={filteredDashboardNodes} // Use filtered nodes for consistency
                                        loading={nodesLoading}
                                        className="h-full"
                                    />
                                )}
                            </div>
                        </div>

                        {/* Upcoming Resignations */}
                        <div className="flex-[1] min-h-0 bg-white dark:bg-[var(--color-bg-card)] rounded-xl shadow-sm border border-gray-100 dark:border-[var(--color-border-light)] flex flex-col overflow-hidden">
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
