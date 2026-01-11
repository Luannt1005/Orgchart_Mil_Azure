import React, { useState, useMemo, useEffect } from 'react';
import type { EmployeeFilter } from '../page';
import { OrgNode } from '@/types/orgchart';

interface EmployeeTableProps {
    className?: string;
    filter?: EmployeeFilter;
    nodes: OrgNode[];  // Required prop
    loading?: boolean;
}

const ITEMS_PER_PAGE = 10;

const EmployeeTable: React.FC<EmployeeTableProps> = ({ className, filter, nodes, loading = false }) => {
    // Data is now passed from parent - no more independent fetching
    const error = null; // Error handling moved to parent
    const [currentPage, setCurrentPage] = useState(1);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setCurrentPage(1);
    }, [filter]);

    // Calculate tenure
    const calculateExperience = (joiningDate: string | number): string => {
        if (!joiningDate) return "0M";

        let startDate: Date;

        if (typeof joiningDate === "number" || /^\d+$/.test(String(joiningDate))) {
            const excelEpoch = new Date(1899, 11, 30);
            startDate = new Date(excelEpoch.getTime() + Number(joiningDate) * 86400000);
        } else if (String(joiningDate).includes("/")) {
            const [day, month, year] = String(joiningDate).split("/").map(Number);
            startDate = new Date(year, month - 1, day);
        } else {
            startDate = new Date(joiningDate);
        }

        if (isNaN(startDate.getTime())) return "0M";

        const now = new Date();
        let years = now.getFullYear() - startDate.getFullYear();
        let months = now.getMonth() - startDate.getMonth();

        if (now.getDate() < startDate.getDate()) months--;
        if (months < 0) { years--; months += 12; }

        if (years <= 0 && months <= 0) return "0 months";

        const yStr = years > 0 ? `${years} year${years > 1 ? 's' : ''}` : '';
        const mStr = months > 0 ? `${months} month${months > 1 ? 's' : ''}` : '';

        if (years > 0 && months > 0) return `${yStr} ${mStr}`;
        if (years > 0) return yStr;
        return mStr;
    };

    // Process and filter employee data
    const employees = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let filtered = nodes.map((node: any) => ({
            empId: node['Emp ID'] || node.id || '',
            title: node['Job Title'] || node.title || '',
            dept: node['Dept'] || node.dept || '',
            experience: calculateExperience(node['Joining\r\n Date'] || node['Joining Date'] || ''),
            fullName: node['FullName '] || node['FullName'] || node.name || 'Unknown',
            dlIdlStaff: node['DL/IDL/Staff'] || '',
            imageUrl: `https://raw.githubusercontent.com/Luannt1005/test-images/main/${node['Emp ID'] || node.id}.jpg`
        }));

        // Apply filters
        if (filter) {
            if (filter.type === 'staff') {
                filtered = filtered.filter(emp => emp.dlIdlStaff.toLowerCase().includes('staff'));
            } else if (filter.type === 'idl') {
                filtered = filtered.filter(emp => emp.dlIdlStaff.toLowerCase().includes('idl'));
            } else if (filter.type === 'title' && filter.value) {
                const keywords = filter.value.toLowerCase().split(" ");
                filtered = filtered.filter(emp => {
                    const title = emp.title.toLowerCase();
                    return keywords.every((k: string) => title.includes(k));
                });
            } else if (filter.type === 'tenure' && filter.value) {
                const [minStr, maxStr] = filter.value.split('-');
                const min = parseInt(minStr);
                const max = maxStr === 'Infinity' ? Infinity : parseInt(maxStr);

                filtered = filtered.filter(emp => {
                    const expStr = emp.experience;
                    let totalMonths = 0;
                    const yearMatch = expStr.match(/(\d+)\s*year/);
                    if (yearMatch) totalMonths += parseInt(yearMatch[1]) * 12;
                    const monthMatch = expStr.match(/(\d+)\s*month/);
                    if (monthMatch) totalMonths += parseInt(monthMatch[1]);
                    return totalMonths >= min && totalMonths < max;
                });
            } else if (filter.type === 'type' && filter.value) {
                const typeValue = filter.value.toLowerCase();
                filtered = filtered.filter(emp => {
                    const dlIdlStaff = emp.dlIdlStaff.toLowerCase();
                    if (typeValue === 'staff') return dlIdlStaff.includes('staff');
                    if (typeValue === 'idl') return dlIdlStaff.includes('idl');
                    if (typeValue === 'dl') return !dlIdlStaff.includes('staff') && !dlIdlStaff.includes('idl');
                    return true;
                });
            }
        }

        return filtered;
    }, [nodes, filter]);

    // Pagination
    const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentEmployees = employees.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    if (loading) {
        return (
            <div className={`h-full flex flex-col ${className}`}>
                <div className="flex-1 p-4 space-y-4 animate-pulse">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-gray-200 shrink-0"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                                <div className="h-2 bg-gray-100 rounded w-1/4"></div>
                            </div>
                            <div className="w-16 h-3 bg-gray-100 rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`h-full flex items-center justify-center text-red-500 text-sm ${className}`}>
                Error loading data
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Table Body - Scrollable */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full">
                    <thead className="border-b border-gray-200 dark:border-[var(--color-border-light)] sticky top-0 z-10 bg-white dark:bg-[var(--color-bg-card)]">
                        <tr className="[&>th]:p-2!">
                            <th className="px-3 text-left text-[10px] font-semibold text-muted uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-2 text-center text-[10px] font-semibold text-muted uppercase tracking-wider">
                                Dept
                            </th>
                            <th className="px-2 text-center text-[10px] font-semibold text-muted uppercase tracking-wider">
                                Title
                            </th>
                            <th className="px-2 text-center text-[10px] font-semibold text-muted uppercase tracking-wider">
                                Tenure
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-[var(--color-border-light)]">
                        {currentEmployees.map((emp, index) => (
                            <tr key={emp.empId || index} className="hover:bg-gray-50 dark:hover:bg-blue-900/10 transition-colors [&>td]:p-2!">
                                {/* Name + Avatar */}
                                <td className="px-3">
                                    <div className="flex items-center gap-2">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={emp.imageUrl}
                                            alt={emp.fullName}
                                            className="w-7 h-7 rounded-full object-cover shadow-sm shrink-0"
                                            onError={(e) => {
                                                const initials = emp.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                                                const colors = ['#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#3B82F6'];
                                                const bgColor = colors[emp.fullName?.charCodeAt(0) % colors.length || 0];
                                                (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Crect fill='${encodeURIComponent(bgColor)}' width='28' height='28' rx='14'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='10' font-weight='600' fill='white'%3E${initials}%3C/text%3E%3C/svg%3E`;
                                            }}
                                        />
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold text-title truncate max-w-[120px]">
                                                {emp.fullName}
                                            </div>
                                            <div className="text-[9px] text-muted">
                                                {emp.empId}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Department */}
                                <td className="px-2 text-center">
                                    <span className="text-[10px] text-body truncate block max-w-[80px] mx-auto">
                                        {emp.dept}
                                    </span>
                                </td>

                                {/* Title */}
                                <td className="px-2 text-center">
                                    <span className="text-[10px] text-body truncate block max-w-[100px] mx-auto">
                                        {emp.title}
                                    </span>
                                </td>

                                {/* Tenure */}
                                <td className="px-2 text-center">
                                    <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-medium ${emp.experience.includes('year')
                                        ? 'bg-purple-50 text-purple-700'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {emp.experience}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination - Compact */}
            {totalPages > 1 && (
                <div className="shrink-0 px-3 py-2 border-t border-gray-100 dark:border-[var(--color-border-light)] flex items-center justify-between bg-white dark:bg-[var(--color-bg-card)]">
                    <span className="text-[10px] text-muted">
                        {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, employees.length)} of {employees.length}
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-2 py-1 text-[10px] font-medium rounded bg-gray-100 dark:bg-[#1E293B] dark:border dark:border-[var(--color-border-light)] text-muted hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Prev
                        </button>
                        <span className="px-2 py-1 text-[10px] font-medium text-muted">
                            {currentPage}/{totalPages}
                        </span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2 py-1 text-[10px] font-medium rounded bg-gray-100 dark:bg-[#1E293B] dark:border dark:border-[var(--color-border-light)] text-muted hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeTable;
