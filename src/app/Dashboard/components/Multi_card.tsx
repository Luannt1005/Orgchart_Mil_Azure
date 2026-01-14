import React, { useMemo } from 'react';
import type { EmployeeFilter } from '../page';
import { OrgNode } from '@/types/orgchart';

interface StatCardProps {
    title: string;
    count: number;
    loading?: boolean;
    onClick?: () => void;
    isActive?: boolean;
}

interface StatsCardsProps {
    className?: string;
    onFilterChange?: (filter: EmployeeFilter) => void;
    activeFilter?: EmployeeFilter;
    nodes: OrgNode[];  // Required prop
    loading?: boolean;
    isFiltered?: boolean;
}

interface CardInfo {
    title: string;
    count: number;
    filterType: string;
    filterValue: string;
    label?: string;
}

// Compact StatCard for 72px height
const StatCard: React.FC<StatCardProps> = ({ title, count, loading, onClick, isActive }) => {
    if (loading) {
        return (
            <div className="h-[72px] bg-[var(--color-bg-card)] rounded-lg shadow-sm flex flex-col items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-1">
                    <div className="h-5 bg-gray-200 rounded w-10"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
            </div>
        );
    }

    return (
        <button
            onClick={onClick}
            className={`
                h-[72px] w-full bg-[var(--color-bg-card)] rounded-lg shadow-sm
                flex flex-col items-center justify-center gap-0.5
                transition-all duration-200 cursor-pointer
                border
                ${isActive
                    ? 'border-[#C40000] shadow-md ring-2 ring-red-100'
                    : 'border-transparent hover:shadow-md hover:border-gray-200'
                }
            `}
        >
            {/* Count - Large number */}
            <div className="text-xl font-bold text-title leading-tight">
                {count.toLocaleString()}
            </div>
            {/* Label - Small uppercase */}
            <div className="text-[10px] font-medium text-muted uppercase tracking-wide text-center px-1 truncate max-w-full">
                {title}
            </div>
        </button>
    );
};

const StatsCards: React.FC<StatsCardsProps> = ({ className, onFilterChange, activeFilter, nodes, loading = false, isFiltered = false }) => {
    // Data is now passed from parent - no more independent fetching
    const error = null; // Error handling moved to parent

    // Helper to count by job title
    const countByTitle = (titleKeyword: string) => {
        if (!nodes || nodes.length === 0) return 0;

        const keywords = titleKeyword
            .toLowerCase()
            .trim()
            .split(/\s+/);

        return nodes.filter((node: any) => {
            const titleWords = (node['Job Title'] || node['title'] || '')
                .toLowerCase()
                .split(/[^a-z0-9]+/i);
            return keywords.every(k => titleWords.includes(k));
        }).length;
    };

    // Calculate all stats
    const stats = useMemo(() => {
        if (!nodes || nodes.length === 0) {
            return {
                specialist: 0,
                supervisor: 0,
                manager: 0,
                director: 0,
                shiftLeader: 0,
                leader: 0,
                warehouseKeeper: 0,
                coordinator: 0,
                technician: 0,
                operator: 0,
                trainee: 0,
                engineer: 0,
                staff: 0,
                idl: 0,
                dl: 0,
                clerk: 0,
                intern: 0,
                total: 0
            };
        }

        const counts = {
            staff: 0,
            idl: 0,
            dl: 0
        };

        nodes.forEach((node: any) => {
            const dlIdlStaff = (node['DL/IDL/Staff'] || '').toLowerCase();
            if (dlIdlStaff.includes('staff')) {
                counts.staff++;
            } else if (dlIdlStaff.includes('idl')) {
                counts.idl++;
            } else {
                counts.dl++;
            }
        });

        return {
            specialist: countByTitle('specialist'),
            supervisor: countByTitle('supervisor'),
            manager: countByTitle('manager'),
            director: countByTitle('director'),
            shiftLeader: countByTitle('shift leader'),
            leader: countByTitle('leader') - countByTitle('shift leader'),
            warehouseKeeper: countByTitle('warehouse keeper') + countByTitle('warehouse storekeeper'),
            coordinator: countByTitle('coordinator'),
            technician: countByTitle('technician'),
            operator: countByTitle('operator'),
            clerk: countByTitle('clerk'),
            trainee: countByTitle('trainee'),
            intern: countByTitle('intern'),
            engineer: countByTitle('engineer'),
            staff: counts.staff,
            idl: counts.idl,
            dl: counts.dl,
            total: nodes.length
        };
    }, [nodes]);

    // Order: High level to Low level
    // Director -> Manager -> Supervisor -> Shift Leader -> Line Leader -> Engineer -> Specialist -> Coordinator -> Technician -> Operator -> WH Keeper -> Clerk -> Trainee -> Intern
    const titleCards: CardInfo[] = [
        { title: 'Director', count: stats.director, filterType: 'title', filterValue: 'director' },
        { title: 'Manager', count: stats.manager, filterType: 'title', filterValue: 'manager' },
        { title: 'Supervisor', count: stats.supervisor, filterType: 'title', filterValue: 'supervisor' },
        { title: 'Shift Leader', count: stats.shiftLeader, filterType: 'title', filterValue: 'shift leader' },
        { title: 'Leader', count: stats.leader, filterType: 'title', filterValue: 'leader' },
        { title: 'Engineer', count: stats.engineer, filterType: 'title', filterValue: 'engineer' },
        { title: 'Specialist', count: stats.specialist, filterType: 'title', filterValue: 'specialist' },
        { title: 'Coordinator', count: stats.coordinator, filterType: 'title', filterValue: 'coordinator' },
        { title: 'Technician', count: stats.technician, filterType: 'title', filterValue: 'technician' },
        { title: 'Operator', count: stats.operator, filterType: 'title', filterValue: 'operator' },
        { title: 'WH Keeper', count: stats.warehouseKeeper, filterType: 'title', filterValue: 'warehouse keeper' },
        { title: 'Clerk', count: stats.clerk, filterType: 'title', filterValue: 'clerk' },
        { title: 'Trainee', count: stats.trainee, filterType: 'title', filterValue: 'trainee' },
        { title: 'Intern', count: stats.intern, filterType: 'title', filterValue: 'intern' }
    ];

    // Show cards: Use the predefined hierarchical order.
    const visibleCards: CardInfo[] = useMemo(() => {
        // Just filter out zero counts if needed, but maintain order.
        let sorted = [...titleCards];

        // If a filter is active, or if we have significantly fewer total employees, hide zero counts
        if (activeFilter?.type !== 'all' || isFiltered) {
            sorted = sorted.filter(c => c.count > 0);
        }

        return sorted;
    }, [titleCards, activeFilter, isFiltered]);

    if (error) {
        return (
            <div className={className}>
                <div className="text-center text-red-600 p-4 bg-red-50 rounded-lg text-sm">
                    Error loading data
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {visibleCards.map((card, index) => (
                <StatCard
                    key={index}
                    title={card.title}
                    count={card.count}
                    loading={loading}
                    onClick={() => onFilterChange?.({
                        type: card.filterType as any,
                        value: card.filterValue,
                        label: card.label || card.title
                    })}
                    isActive={
                        (card.filterType === 'all' && activeFilter?.type === 'all') ||
                        (activeFilter?.type === card.filterType && activeFilter?.value === card.filterValue)
                    }
                />
            ))}
        </div>
    );
};

export default StatsCards;
