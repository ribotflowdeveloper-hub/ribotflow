// src/app/[locale]/(app)/crm/general/_components/charts/LeadSourceConversionChart.tsx

"use client";

import { FC } from 'react';
import { useTheme } from 'next-themes';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';
import { type LeadConversionData } from '../CrmData';
import { useTranslations } from 'next-intl';

interface LeadSourceConversionChartProps {
    data: LeadConversionData[];
}

export const LeadSourceConversionChart: FC<LeadSourceConversionChartProps> = ({ data }) => {
    const { theme } = useTheme();
    const t = useTranslations('CrmGeneralPage');
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';
    
    if (!data || data.length === 0) {
        return <p className="text-muted-foreground text-sm text-center p-4">{t('noLeadSourceData')}</p>;
    }
    
    // Ordenem les dades per taxa de conversió per a una millor visualització
    const sortedData = [...data].sort((a, b) => b.conversion_rate - a.conversion_rate);

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sortedData} margin={{ top: 20, right: 30, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis 
                        dataKey="source" 
                        stroke={textColor} 
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                    />
                    <YAxis 
                        stroke={textColor} 
                        fontSize={12}
                        tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                        formatter={(value: number, name, props) => [`${value.toFixed(1)}%`, `Taxa de conversió (${props.payload.total} leads)`]}
                    />
                    <Bar dataKey="conversion_rate" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                        <LabelList
                            dataKey="conversion_rate"
                            position="top"
                            fill={textColor}
                            fontSize={12}
                            content={({ value, x, y }) =>
                                typeof value === 'number'
                                    ? (
                                        <text
                                            fill={textColor}
                                            fontSize={12}
                                            x={x}
                                            y={y}
                                            textAnchor="middle"
                                            dy={-6}
                                        >{`${value.toFixed(0)}%`}</text>
                                    )
                                    : null
                            }
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};