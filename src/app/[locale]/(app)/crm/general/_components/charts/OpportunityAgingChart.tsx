// src/app/[locale]/(app)/crm/general/_components/charts/OpportunityAgingChart.tsx

"use client";

import { FC } from 'react';
import { useTheme } from 'next-themes';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList, Cell } from 'recharts';
import { type OpportunityAgingData } from '../CrmData';
import { useTranslations } from 'next-intl';

interface OpportunityAgingChartProps {
    data: OpportunityAgingData[];
}

// Un color més fosc si el valor és alt (indica un problema)
const getBarColor = (days: number) => {
    if (days > 30) return '#ef4444'; // red-500
    if (days > 15) return '#f97316'; // orange-500
    return '#3b82f6'; // blue-500
};

export const OpportunityAgingChart: FC<OpportunityAgingChartProps> = ({ data }) => {
    const { theme } = useTheme();
    const t = useTranslations('CrmGeneralPage');
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

    if (!data || data.length === 0) {
        return <p className="text-muted-foreground text-sm text-center p-4">{t('noOpportunityData')}</p>;
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                    <XAxis type="number" stroke={textColor} fontSize={12} />
                    <YAxis 
                        type="category" 
                        dataKey="stage_name" 
                        stroke={textColor} 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        width={100}
                        tickFormatter={(value) => value.length > 15 ? `${value.substring(0, 15)}...` : value}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number) => [`${value} dies`, 'Antiguitat mitjana']}
                    />
                    <Bar dataKey="avg_days" background={{ fill: 'hsl(var(--muted))' }} radius={[0, 4, 4, 0]}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.avg_days)} />
                        ))}
                        <LabelList
                            dataKey="avg_days"
                            position="right"
                            fill={textColor}
                            fontSize={12}
                            formatter={(label) =>
                                typeof label === 'number' ? `${label}d` : label
                            }
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};