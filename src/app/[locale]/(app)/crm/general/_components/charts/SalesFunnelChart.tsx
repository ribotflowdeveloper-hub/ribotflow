"use client";

import { FC } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { CrmData } from '../CrmData';

interface SalesFunnelChartProps {
    data: CrmData['funnel'];
    t: (key: string) => string;
}

export const SalesFunnelChart: FC<SalesFunnelChartProps> = ({ data, t }) => {
    if (!data || (data.leads === 0 && data.quoted === 0 && data.clients === 0)) {
        return <p className="text-sm text-muted-foreground text-center py-8">No hi ha prou dades per mostrar l'embut de vendes.</p>;
    }
    const funnelData = [
        { name: t('leads'), value: data.leads, color: '#8884d8' },
        { name: t('quoted'), value: data.quoted, color: '#82ca9d' },
        { name: t('clients'), value: data.clients, color: '#ffc658' },
    ];
    return (
        <ResponsiveContainer width="100%" height={250}>
            <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} width={80} />
                <Tooltip cursor={{ fill: 'hsl(var(--muted))' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} background={{ fill: 'hsl(var(--muted) / 0.5)', radius: 4 }}>
                    {funnelData.map((_entry, index) => (<Cell key={`cell-${index}`} fill={funnelData[index].color} />))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};