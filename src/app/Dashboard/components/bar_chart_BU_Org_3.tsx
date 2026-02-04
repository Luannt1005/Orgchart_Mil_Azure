import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LabelList, Tooltip } from 'recharts';
import { OrgNode } from '@/types/orgchart';

interface BUOrg3ChartProps {
    className?: string;
    nodes: OrgNode[];  // Required prop
    loading?: boolean;
}

const BUOrg3Chart: React.FC<BUOrg3ChartProps> = ({ className, nodes, loading = false }) => {
    // Data is now passed from parent - no more independent fetching
    const error = null; // Error handling moved to parent

    // Process data: group by BU Org 3
    const chartData = useMemo(() => {
        if (!nodes || nodes.length === 0) return [];

        const groupedData: Record<string, number> = {};

        nodes.forEach((node: any) => {
            // Use 'BU Org 3' from Supabase API, fallback to 'Dept' if not available
            const buOrg3 = node['BU Org 3'] || node['BU Org 3 '] || node['Dept'] || node['dept'] || 'Unknown';
            if (!groupedData[buOrg3]) groupedData[buOrg3] = 0;
            groupedData[buOrg3]++;
        });

        // Return all departments
        return Object.entries(groupedData)
            .map(([name, count]) => ({
                // Truncate less aggressively: 25 chars
                name: name.length > 25 ? name.slice(0, 25) + '...' : name,
                fullName: name,
                count
            }))
            .filter(item => item.fullName !== 'Unknown' && item.count > 0)
            .sort((a, b) => b.count - a.count);
    }, [nodes]);

    if (loading) {
        return (
            <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-4 h-full flex flex-col ${className}`}>
                <div className="flex items-center justify-between mb-4 animate-pulse">
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
                    <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="flex-1 flex items-end gap-2 animate-pulse px-2 overflow-hidden">
                    {[...Array(12)].map((_, i) => (
                        <div key={i} className="flex-1 bg-gray-100 rounded-t" style={{ height: `${[45, 60, 75, 50, 65, 40, 55, 70, 45, 60, 50, 65][i]}%` }}></div>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !chartData || chartData.length === 0) {
        return (
            <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-4 h-full flex items-center justify-center text-muted text-sm ${className}`}>
                No department data
            </div>
        );
    }

    return (
        <div className={`bg-[var(--color-bg-card)] rounded-xl shadow-sm p-2 h-full flex flex-col min-h-0 ${className}`}>
            {/* Header */}
            <div className="shrink-0 mb-2 flex items-center justify-between">
                <h3 className="text-[15px] font-bold text-title">Departments</h3>
                <span className="text-[12px] text-muted">{chartData.length} depts</span>
            </div>

            {/* Chart */}
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: 10, bottom: 60 }} // Increased bottom margin
                    >
                        <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#3B82F6" stopOpacity={1} />
                                <stop offset="100%" stopColor="#6366F1" stopOpacity={1} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="name"
                            angle={-35}
                            textAnchor="end"
                            height={60} // Increased height for rotated labels
                            interval={0}
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
                            formatter={(value: number | undefined) => [value ?? 0, 'Employees']}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                            labelStyle={{ color: '#64748B', fontWeight: 600, marginBottom: '4px' }}
                        />
                        <Bar
                            dataKey="count"
                            fill="url(#barGradient)"
                            radius={[6, 6, 0, 0]}
                            barSize={35}
                        >
                            <LabelList
                                dataKey="count"
                                position="top"
                                offset={8}
                                style={{ fill: 'var(--color-text-title)', fontWeight: 800, fontSize: 11 }}
                            />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default BUOrg3Chart;
