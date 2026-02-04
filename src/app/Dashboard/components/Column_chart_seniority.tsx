import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, Tooltip } from 'recharts';
import type { EmployeeFilter } from '../page';
import { OrgNode } from '@/types/orgchart';

interface SeniorityChartProps {
    className?: string;
    onFilterChange?: (filter: EmployeeFilter) => void;
    nodes: OrgNode[];  // Required prop
    loading?: boolean;
}

// Shorter tenure bucket labels
const TENURE_BUCKETS = [
    { key: '< 3M', label: '< 3 months', min: 0, max: 3 },
    { key: '3-6M', label: '3-6 months', min: 3, max: 6 },
    { key: '6-12M', label: '6-12 months', min: 6, max: 12 },
    { key: '1-3Y', label: '1-3 years', min: 12, max: 36 },
    { key: '3-5Y', label: '3-5 years', min: 36, max: 60 },
    { key: '> 5Y', label: '> 5 years', min: 60, max: Infinity }
];

// Colors
const COLORS = {
    Staff: '#8B5CF6',  // Purple
    IDL: '#0EA5E9'     // Sky Blue (Cyan-ish)
};

const SeniorityChart: React.FC<SeniorityChartProps> = ({ className, onFilterChange, nodes, loading = false }) => {
    // ... (lines 30-100 skipped for brevity, keeping same)
    // Data is now passed from parent - no more independent fetching
    const error = null; // Error handling moved to parent

    // Helper function to calculate months from joining date
    const calculateMonthsFromDate = (joiningDate: string | number): number => {
        if (!joiningDate) return 0;
        // ... (implementation of calculateMonthsFromDate)
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
        if (isNaN(startDate.getTime())) return 0;
        const now = new Date();
        let years = now.getFullYear() - startDate.getFullYear();
        let months = now.getMonth() - startDate.getMonth();
        if (now.getDate() < startDate.getDate()) months--;
        if (months < 0) { years--; months += 12; }
        return years * 12 + months;
    };

    // Process data
    const chartData = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];
        const buckets = TENURE_BUCKETS.map(bucket => ({
            name: bucket.key,
            fullName: bucket.label,
            Staff: 0,
            IDL: 0,
            total: 0,
            min: bucket.min,
            max: bucket.max
        }));
        nodes.forEach((node: any) => {
            const joiningDate = node['Joining\r\n Date'] || node['Joining Date'] || '';
            if (!joiningDate) return;
            const dlIdlStaff = (node['DL/IDL/Staff'] || '').toLowerCase();
            const totalMonths = calculateMonthsFromDate(joiningDate);
            for (let i = 0; i < TENURE_BUCKETS.length; i++) {
                const bucket = TENURE_BUCKETS[i];
                if (totalMonths >= bucket.min && totalMonths < bucket.max) {
                    if (dlIdlStaff.includes('staff')) {
                        buckets[i].Staff++;
                    } else if (dlIdlStaff.includes('idl')) {
                        buckets[i].IDL++;
                    }
                    buckets[i].total = buckets[i].Staff + buckets[i].IDL;
                    break;
                }
            }
        });
        return buckets;
    }, [nodes]);

    const totalEmployees = chartData.reduce((sum, item) => sum + item.Staff + item.IDL, 0);

    // Compact legend
    const renderLegend = () => (
        <div className="flex justify-center gap-4 mb-2">
            <button
                className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
                onClick={() => onFilterChange?.({ type: 'staff', value: 'Staff', label: 'Type: Staff' })}
            >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.Staff }}></span>
                <span className="text-body font-medium">Staff</span>
            </button>
            <button
                className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
                onClick={() => onFilterChange?.({ type: 'idl', value: 'IDL', label: 'Type: IDL' })}
            >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS.IDL }}></span>
                <span className="text-body font-medium">IDL</span>
            </button>
        </div>
    );

    if (loading) {
        return (
            <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-4 h-full flex flex-col ${className}`}>
                <div className="flex items-center justify-between mb-4 animate-pulse">
                    <div className="h-5 w-32 bg-gray-200 rounded"></div>
                    <div className="flex gap-2">
                        <div className="h-3 w-12 bg-gray-200 rounded"></div>
                        <div className="h-3 w-12 bg-gray-200 rounded"></div>
                    </div>
                </div>
                <div className="flex-1 flex items-end justify-between gap-2 px-2 animate-pulse">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="w-full bg-gray-100 rounded-t-lg" style={{ height: `${[45, 60, 35, 70, 50, 65][i]}%` }}></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-4 h-full flex flex-col ${className}`}>
                <div className="text-center text-red-500 flex-1 flex items-center justify-center text-sm">
                    Error loading data
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-1 h-full flex flex-col min-h-0 ${className}`}>
            {/* Header */}
            <div className="shrink-0 mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-[13px] pl-1 py-1 font-bold text-title">Headcount by Tenure</h3>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-[#8B5CF6]"></span>
                        <span className="text-[11px] font-semibold text-body">Staff</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-sm bg-[#F59E0B]"></span>
                        <span className="text-[11px] font-semibold text-body">IDL</span>
                    </div>
                </div>
            </div>

            {/* Chart */}
            {/* Chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                    >
                        <defs>
                            <linearGradient id="staffGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#C4B5FD" stopOpacity={1} />
                            </linearGradient>
                            <linearGradient id="idlGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1} />
                                <stop offset="100%" stopColor="#7DD3FC" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="name"
                            tick={{
                                fill: 'var(--color-text-body)',
                                fontSize: 11,
                                fontWeight: 700
                            }}
                            axisLine={{ stroke: 'var(--color-border-light)' }}
                            tickLine={false}
                        />
                        <Tooltip
                            isAnimationActive={false}
                            contentStyle={{
                                backgroundColor: 'var(--color-bg-card)',
                                border: '1px solid var(--color-border-light)',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                color: 'var(--color-text-body)',
                                fontSize: '12px'
                            }}
                            itemStyle={{ color: 'var(--color-text-body)' }}
                            formatter={(value: any, name: any) => [value, name]}
                            labelFormatter={(label) => chartData.find(d => d.name === label)?.fullName || label}
                            labelStyle={{ color: '#64748B', fontWeight: 600, marginBottom: '4px' }}
                        />
                        <Bar
                            dataKey="Staff"
                            stackId="a"
                            fill="url(#staffGradient)"
                            radius={[0, 0, 0, 0]}
                            barSize={35}
                        >
                            <LabelList
                                dataKey="Staff"
                                position="inside"
                                style={{ fill: '#FFFFFF', fontWeight: 800, fontSize: 11 }}
                                formatter={(value: any) => value > 0 ? value : ''}
                            />
                        </Bar>
                        <Bar
                            dataKey="IDL"
                            stackId="a"
                            fill="url(#idlGradient)"
                            radius={[6, 6, 0, 0]}
                            barSize={35}
                        >
                            <LabelList
                                dataKey="IDL"
                                position="top"
                                offset={8}
                                style={{ fill: 'var(--color-text-title)', fontWeight: 800, fontSize: 11 }}
                                formatter={(value: any) => value > 0 ? value : ''}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SeniorityChart;
