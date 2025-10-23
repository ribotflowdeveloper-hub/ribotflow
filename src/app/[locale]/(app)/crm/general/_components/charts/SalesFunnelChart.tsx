// src/app/[locale]/(app)/crm/general/_components/charts/SalesFunnelChart.tsx

"use client";

import { FC } from 'react';
import { FunnelChart, Funnel, Tooltip, ResponsiveContainer, LabelList } from 'recharts';

interface SalesFunnelChartProps {
    data: {
        leads: number;
        quoted: number;
        clients: number;
    };
    t: (key: string) => string;
}

export const SalesFunnelChart: FC<SalesFunnelChartProps> = ({ data, t }) => {
    const funnelData = [
        { name: t('funnel.leads'), value: data.leads, fill: '#8b5cf6' },
        { name: t('funnel.quoted'), value: data.quoted, fill: '#3b82f6' },
        { name: t('funnel.clients'), value: data.clients, fill: '#22c55e' },
    ];

    return (
        <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <FunnelChart>
                    <Tooltip
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                        }}
                    />
                    <Funnel dataKey="value" data={funnelData} isAnimationActive>
                         <LabelList position="right" fill="hsl(var(--foreground))" stroke="none" dataKey="name" />
                         <LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight="bold" />
                    </Funnel>
                </FunnelChart>
            </ResponsiveContainer>
        </div>
    );
};