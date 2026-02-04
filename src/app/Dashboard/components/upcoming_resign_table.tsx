import React, { useMemo, useState } from 'react';
import { OrgNode } from '@/types/orgchart';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

interface UpcomingResignTableProps {
    className?: string;
    nodes: OrgNode[];  // Required prop
    loading?: boolean;
}

const UpcomingResignTable: React.FC<UpcomingResignTableProps> = ({ className, nodes, loading = false }) => {
    // Data is now passed from parent - no more independent fetching
    const error = null; // Error handling moved to parent
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;

    // Format date from Excel serial or string
    const parseDate = (dateValue: string | number): Date | null => {
        if (!dateValue) return null;
        let date: Date;

        if (typeof dateValue === "number" || /^\d+$/.test(String(dateValue))) {
            const excelEpoch = new Date(1899, 11, 30);
            date = new Date(excelEpoch.getTime() + Number(dateValue) * 86400000);
        } else if (String(dateValue).includes("/")) {
            const [day, month, year] = String(dateValue).split("/").map(Number);
            date = new Date(year, month - 1, day);
        } else {
            date = new Date(dateValue);
        }
        return isNaN(date.getTime()) ? null : date;
    };

    const formatDate = (dateValue: string | number): string => {
        const date = parseDate(dateValue);
        if (!date) return String(dateValue || '');
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        // Return DD/MM for display
        return `${day}/${month}`;
    };

    const calculateSeniority = (joinDateVal: string | number, leaveDateVal: string | number): string => {
        const joinDate = parseDate(joinDateVal);
        const leaveDate = parseDate(leaveDateVal);
        if (!joinDate || !leaveDate) return '';

        let years = leaveDate.getFullYear() - joinDate.getFullYear();
        let months = leaveDate.getMonth() - joinDate.getMonth();
        let days = leaveDate.getDate() - joinDate.getDate();

        if (days < 0) {
            months--;
        }
        if (months < 0) {
            years--;
            months += 12;
        }

        const parts = [];
        if (years > 0) parts.push(years === 1 ? '1 year' : `${years} years`);
        if (months > 0) parts.push(months === 1 ? '1 month' : `${months} months`);

        if (parts.length === 0) return '0 months';
        return parts.join(' ');
    };

    // Helper to find value by flexible key matching
    const getValue = (obj: any, keys: string[]) => {
        if (!obj) return '';
        // 1. Try exact matches
        for (const key of keys) {
            if (obj[key] !== undefined && obj[key] !== null && String(obj[key]).trim() !== '') {
                return obj[key];
            }
        }
        // 2. Try case-insensitive/normalized matches
        const objKeys = Object.keys(obj);
        const normalizedKeys = keys.map(k => k.toLowerCase().replace(/[\s\r\n_]/g, ''));

        for (const objKey of objKeys) {
            const normalizedObjKey = objKey.toLowerCase().replace(/[\s\r\n_]/g, '');
            if (normalizedKeys.includes(normalizedObjKey)) {
                const val = obj[objKey];
                if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return val;
                }
            }
        }
        return '';
    };

    // Filter employees with Last Working Day
    const resigningEmployees = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];

        return nodes
            .filter((node: any) => {
                const lastWorkingDay = getValue(node, [
                    'Last Working\r\nDay',
                    'Last Working Day',
                    'last_working_day',
                    'last working day',
                    'LWD',
                    'Resignation Date'
                ]);
                return lastWorkingDay && String(lastWorkingDay).trim() !== '';
            })
            .map((node: any) => {
                const lastWorkingDay = getValue(node, [
                    'Last Working\r\nDay',
                    'Last Working Day',
                    'last_working_day',
                    'last working day',
                    'LWD',
                    'Resignation Date'
                ]);

                const joiningDate = getValue(node, [
                    'Joining\r\n Date',
                    'Joining Date',
                    'joining_date',
                    'joining date',
                    'Join Date'
                ]);

                return {
                    empId: getValue(node, ['Employee ID', 'Emp ID', 'emp_id', 'id']),
                    fullName: getValue(node, ['Full Name', 'Name', 'FullName ', 'FullName', 'full_name']),
                    jobTitle: getValue(node, ['Job Title', 'job_title', 'Title', 'title']),
                    dept: getValue(node, ['BU Org 3', 'Department', 'Dept', 'bu_org_3']),
                    lastWorkingDay: lastWorkingDay,
                    seniority: calculateSeniority(joiningDate, lastWorkingDay),
                    imageUrl: `https://raw.githubusercontent.com/Luannt1005/test-images/main/${getValue(node, ['Employee ID', 'Emp ID', 'emp_id'])}.jpg`
                };
            })
            .sort((a, b) => {
                // Sort by date (ascending)
                const dateA = parseDate(a.lastWorkingDay)?.getTime() || 0;
                const dateB = parseDate(b.lastWorkingDay)?.getTime() || 0;
                return dateA - dateB;
            });
    }, [nodes]);

    const totalPages = Math.ceil(resigningEmployees.length / ITEMS_PER_PAGE);
    const paginatedEmployees = resigningEmployees.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const handlePrevPage = () => setCurrentPage(p => Math.max(1, p - 1));
    const handleNextPage = () => setCurrentPage(p => Math.min(totalPages, p + 1));

    if (loading) {
        return (
            <div className={`h-full flex flex-col ${className}`}>
                <div className="flex-1 p-3 space-y-3 animate-pulse">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-gray-200 shrink-0"></div>
                            <div className="flex-1 space-y-1.5">
                                <div className="h-2.5 bg-gray-200 rounded w-2/3"></div>
                                <div className="h-2 bg-gray-100 rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`h-full flex items-center justify-center text-gray-400 text-xs ${className}`}>
                Error loading data
            </div>
        );
    }

    if (resigningEmployees.length === 0) {
        return (
            <div className={`h-full flex items-center justify-center text-muted ${className}`}>
                <div className="text-center">
                    <svg className="w-8 h-8 mx-auto mb-1 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[13px] pl-1 py-1 font-bold text-title">No upcoming resignations</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`h-full flex flex-col ${className}`}>
            {/* Structured Table */}
            <div className="flex-1 overflow-auto custom-scrollbar bg-[var(--color-bg-card)] relative">
                <table className="w-full text-left border-collapse">
                    <thead className="border-b border-[var(--color-border-light)]">
                        <tr>
                            <th className="sticky top-0 z-10 bg-[var(--color-bg-card)] py-1.5 px-4 text-[10px] font-bold text-muted uppercase tracking-wider w-[40%] text-center shadow-sm">Employee</th>
                            <th className="sticky top-0 z-10 bg-[var(--color-bg-card)] py-1.5 px-2 text-[10px] font-bold text-muted uppercase tracking-wider w-[25%] hidden sm:table-cell text-center shadow-sm">Dept</th>
                            <th className="sticky top-0 z-10 bg-[var(--color-bg-card)] py-1.5 px-2 text-[10px] font-bold text-muted uppercase tracking-wider w-[15%] text-center whitespace-nowrap shadow-sm">Seniority</th>
                            <th className="sticky top-0 z-10 bg-[var(--color-bg-card)] py-1.5 px-4 text-[10px] font-bold text-muted uppercase tracking-wider w-[20%] text-center whitespace-nowrap shadow-sm">LWD</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {paginatedEmployees.map((emp, index) => (
                            <tr key={emp.empId || index} className="group hover:bg-indigo-50/30 transition-colors">
                                {/* Employee Column */}
                                <td className="py-2.5 px-4 align-middle">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={emp.imageUrl}
                                            alt={emp.fullName}
                                            className="w-9 h-9 rounded-full object-cover border border-gray-100 shadow-sm group-hover:border-indigo-100 transition-colors"
                                            onError={(e) => {
                                                const initials = emp.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                                                const colors = ['#EF4444', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
                                                const bgColor = colors[emp.fullName?.charCodeAt(0) % colors.length || 0];
                                                (e.target as HTMLImageElement).src = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24'%3E%3Crect fill='${encodeURIComponent(bgColor)}' width='24' height='24' rx='12'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='system-ui' font-size='9' font-weight='600' fill='white'%3E${initials}%3C/text%3E%3C/svg%3E`;
                                            }}
                                        />
                                        <div className="min-w-0 text-left">
                                            <div className="text-[11px] font-bold text-title truncate max-w-[140px]" title={emp.fullName}>
                                                {emp.fullName}
                                            </div>
                                            <div className="text-[10px] text-muted truncate max-w-[140px]" title={emp.jobTitle}>
                                                {emp.jobTitle}
                                            </div>
                                        </div>
                                    </div>
                                </td>

                                {/* Dept Column */}
                                <td className="py-2.5 px-2 align-middle hidden sm:table-cell text-center">
                                    <div className="text-[10px] font-medium text-body truncate max-w-[120px] mx-auto" title={emp.dept}>
                                        {emp.dept}
                                    </div>
                                </td>

                                {/* Seniority Column */}
                                <td className="py-2.5 px-2 align-middle text-center whitespace-nowrap">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                                        {emp.seniority}
                                    </span>
                                </td>

                                {/* LWD Column */}
                                <td className="py-2.5 px-4 align-middle text-center whitespace-nowrap">
                                    <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-100 shadow-sm group-hover:bg-rose-100 transition-colors">
                                        {formatDate(emp.lastWorkingDay)}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer - Pagination */}
            {resigningEmployees.length > 0 && (
                <div className="shrink-0 px-3 py-2 border-t border-[var(--color-border-light)] flex items-center justify-between bg-[var(--color-bg-card)]">
                    <span className="text-[10px] text-muted font-medium">
                        showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, resigningEmployees.length)} of {resigningEmployees.length}
                    </span>

                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage === 1}
                                className="p-1 rounded hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronLeftIcon className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                            <span className="text-[10px] font-semibold text-gray-700 w-3 text-center">
                                {currentPage}
                            </span>
                            <button
                                onClick={handleNextPage}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                            >
                                <ChevronRightIcon className="w-3.5 h-3.5 text-gray-600" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default UpcomingResignTable;
