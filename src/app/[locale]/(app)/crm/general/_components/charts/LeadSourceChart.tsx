// src/app/[locale]/(app)/crm/general/_components/charts/LeadSourceChart.tsx

"use client";

import { FC } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface LeadSourceChartProps {
    data: { source: string; count: number }[];
}

const COLORS = ['#3b82f6', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export const LeadSourceChart: FC<LeadSourceChartProps> = ({ data }) => {
    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                    />
                     <Legend iconType="circle" />
                    <Pie data={data} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};