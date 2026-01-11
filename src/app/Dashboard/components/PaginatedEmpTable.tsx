import React, { useMemo } from 'react';
import { usePaginatedSheetData } from '@/hooks/usePaginatedSheetData';

interface PaginatedEmployeeTableProps {
    className?: string;
    pageSize?: number;
}

/**
 * Server-side paginated employee table
 * Uses usePaginatedSheetData hook for incremental data loading
 * More efficient for initial loads when no filters are applied
 */
const PaginatedEmployeeTable: React.FC<PaginatedEmployeeTableProps> = ({
    className,
    pageSize = 10
}) => {
    const {
        nodes,
        page,
        totalPages,
        total,
        startIndex,
        endIndex,
        loading,
        error,
        nextPage,
        prevPage,
        hasNextPage,
        hasPrevPage,
    } = usePaginatedSheetData({ pageSize });

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

    // Transform nodes to display format
    const employees = useMemo(() => {
        return nodes.map((node: any) => ({
            empId: node['Emp ID'] || node.id || '',
            title: node['Job Title'] || node.title || '',
            dept: node['Dept'] || node.dept || '',
            experience: calculateExperience(node['Joining\r\n Date'] || node['Joining Date'] || ''),
            fullName: node['FullName '] || node['FullName'] || node.name || 'Unknown',
            dlIdlStaff: node['DL/IDL/Staff'] || '',
            imageUrl: `https://raw.githubusercontent.com/Luannt1005/test-images/main/${node['Emp ID'] || node.id}.jpg`
        }));
    }, [nodes]);

    if (loading && employees.length === 0) {
        return (
            <div className={`h-full flex items-center justify-center ${className}`}>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#C40000]"></div>
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
                    <thead className="border-b border-[var(--color-border-light)] sticky top-0 z-10 bg-[var(--color-bg-card)]">
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
                    <tbody className="divide-y divide-[var(--color-border-light)]">
                        {employees.map((emp, index) => (
                            <tr key={emp.empId || index} className="hover:bg-gray-50 dark:hover:bg-blue-900/10 transition-colors [&>td]:p-2!">
                                {/* Name + Avatar */}
                                <td className="px-3">
                                    <div className="flex items-center gap-2">
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

                {/* Loading indicator for page transitions */}
                {loading && employees.length > 0 && (
                    <div className="flex justify-center py-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#C40000]"></div>
                    </div>
                )}
            </div>

            {/* Pagination - Server-side */}
            {totalPages > 1 && (
                <div className="shrink-0 px-3 py-2 border-t border-[var(--color-border-light)] flex items-center justify-between bg-[var(--color-bg-card)]">
                    <span className="text-[10px] text-muted">
                        {startIndex}-{endIndex} of {total}
                    </span>
                    <div className="flex gap-1">
                        <button
                            onClick={prevPage}
                            disabled={!hasPrevPage || loading}
                            className="px-2 py-1 text-[10px] font-medium rounded bg-[var(--color-bg-page)] border border-[var(--color-border-light)] text-muted hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Prev
                        </button>
                        <span className="px-2 py-1 text-[10px] font-medium text-muted">
                            {page}/{totalPages}
                        </span>
                        <button
                            onClick={nextPage}
                            disabled={!hasNextPage || loading}
                            className="px-2 py-1 text-[10px] font-medium rounded bg-[var(--color-bg-page)] border border-[var(--color-border-light)] text-muted hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaginatedEmployeeTable;
