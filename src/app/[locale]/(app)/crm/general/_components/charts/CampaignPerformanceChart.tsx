// src/app/[locale]/(app)/crm/general/_components/charts/CampaignPerformanceChart.tsx (CORREGIT)

"use client";

import { FC } from 'react';
import { RadialBarChart, RadialBar, Legend, ResponsiveContainer, Tooltip} from 'recharts';
import { type CampaignPerformanceData } from '../CrmData';
import { useTranslations } from 'next-intl';

interface CampaignPerformanceChartProps {
    data: CampaignPerformanceData[];
}

export const CampaignPerformanceChart: FC<CampaignPerformanceChartProps> = ({ data }) => {
    const t = useTranslations('CrmGeneralPage');

    if (!data || data.length === 0) {
        return <p className="text-muted-foreground text-sm text-center p-4">{t('noCampaignData')}</p>;
    }

    return (
        <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                    cx="50%" 
                    cy="50%" 
                    innerRadius="10%" 
                    outerRadius="80%" 
                    barSize={10} 
                    data={data}
                    startAngle={180}
                    endAngle={0}
                >
                    <RadialBar
                        background
                        dataKey="roi"
                    />
                    <Legend 
                        iconSize={10} 
                        layout="vertical" 
                        verticalAlign="middle" 
                        wrapperStyle={{ top: '50%', right: 0, transform: 'translate(0, -50%)', lineHeight: '24px' }}
                    />
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                         formatter={(value: number) => [`${value.toFixed(1)}%`, 'ROI']}
                    />
                </RadialBarChart>
            </ResponsiveContainer>
        </div>
    );
};