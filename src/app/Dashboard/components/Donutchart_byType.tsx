import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { EmployeeFilter } from '../page';
import { OrgNode } from '@/types/orgchart';

interface DonutChartProps {
    className?: string;
    onFilterChange?: (filter: EmployeeFilter) => void;
    nodes: OrgNode[];  // Required prop
    loading?: boolean;
}

const DonutChart: React.FC<DonutChartProps> = ({ className, onFilterChange, nodes, loading = false }) => {
    // Calculate counts by type
    const chartData = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];

        const counts = { Staff: 0, IDL: 0, DL: 0 };

        nodes.forEach((node: any) => {
            const dlIdlStaff = (node['DL/IDL/Staff'] || '').toLowerCase();
            if (dlIdlStaff.includes('staff')) {
                counts.Staff++;
            } else if (dlIdlStaff.includes('idl')) {
                counts.IDL++;
            } else {
                counts.DL++;
            }
        });

        const total = counts.Staff + counts.IDL + counts.DL;

        return [
            { name: 'Staff', value: counts.Staff, percentage: total > 0 ? Math.round((counts.Staff / total) * 100) : 0 },
            { name: 'IDL', value: counts.IDL, percentage: total > 0 ? Math.round((counts.IDL / total) * 100) : 0 },
            { name: 'DL', value: counts.DL, percentage: total > 0 ? Math.round((counts.DL / total) * 100) : 0 }
        ].filter(item => item.value > 0);
    }, [nodes]);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    // Custom Label with Line
    const renderCustomizedLabel = (props: any) => {
        const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, value, name } = props;
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 1.4;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);

        return (
            <text
                x={x}
                y={y}
                fill="var(--color-text-body)"
                textAnchor={x > cx ? 'start' : 'end'}
                dominantBaseline="central"
                className="text-[10px] font-bold"
            >
                {`${value}`}
            </text>
        );
    };

    if (loading) {
        return (
            <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-4 h-full flex flex-col ${className}`}>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 animate-pulse">
                    <div className="w-48 h-48 rounded-full border-[16px] border-gray-100"></div>
                </div>
            </div>
        );
    }

    if (!chartData || chartData.length === 0) {
        return (
            <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-4 h-full flex flex-col ${className}`}>
                <div className="text-center text-gray-400 flex-1 flex items-center justify-center text-sm">
                    No data available
                </div>
            </div>
        );
    }

    return (
        <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-4 h-full flex flex-col min-h-0 ${className}`}>
            <div className="shrink-0 mb-2">
                <h3 className="text-[13px] pl-1 font-bold text-title">Employee Type</h3>
            </div>

            <div className="flex-1 min-h-0 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <defs>
                            <linearGradient id="gradStaff" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#C4B5FD" stopOpacity={1} />
                            </linearGradient>
                            <linearGradient id="gradIDL" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0EA5E9" stopOpacity={1} />
                                <stop offset="100%" stopColor="#7DD3FC" stopOpacity={1} />
                            </linearGradient>
                            <linearGradient id="gradDL" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#93C5FD" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="45%"
                            innerRadius="45%" // Slightly smaller inner radius to fit centered text better
                            outerRadius="70%" // Slightly smaller outer radius to make room for labels
                            paddingAngle={2}
                            dataKey="value"
                            animationDuration={600}
                            labelLine={true}
                            label={renderCustomizedLabel}
                        >
                            {chartData.map((entry, index) => {
                                let fillUrl = 'url(#gradDL)';
                                if (entry.name === 'Staff') fillUrl = 'url(#gradStaff)';
                                else if (entry.name === 'IDL') fillUrl = 'url(#gradIDL)';

                                return (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={fillUrl}
                                        style={{ outline: 'none', cursor: 'pointer' }}
                                        onClick={() => onFilterChange?.({ type: 'type', value: entry.name, label: `Type: ${entry.name}` })}
                                    />
                                )
                            })}
                        </Pie>
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
                            itemStyle={{ color: '#1E293B' }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={30}
                            content={({ payload }) => (
                                <div className="flex justify-center gap-4 mt-1">
                                    {payload?.map((entry: any, index: number) => {
                                        const data = chartData.find(d => d.name === entry.value);
                                        let dotColor = '#3B82F6';
                                        if (entry.value === 'Staff') dotColor = '#8B5CF6';
                                        if (entry.value === 'IDL') dotColor = '#0EA5E9';

                                        return (
                                            <button
                                                key={`legend-${index}`}
                                                className="flex items-center gap-1.5 text-xs hover:opacity-70 transition-opacity"
                                                onClick={() => onFilterChange?.({ type: 'type', value: entry.value, label: `Type: ${entry.value}` })}
                                            >
                                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }}></span>
                                                <span className="text-body font-medium">{entry.value}</span>
                                                <span className="text-muted">({data?.percentage}%)</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>

                <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <div className="text-2xl font-bold text-title">{total}</div>
                    <div className="text-[10px] text-muted uppercase tracking-wide">Total</div>
                </div>
            </div>
        </div>
    );
};

export default DonutChart;
