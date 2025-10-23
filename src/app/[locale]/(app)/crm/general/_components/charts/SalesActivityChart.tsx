// src/app/[locale]/(app)/crm/general/_components/charts/SalesActivityChart.tsx

"use client";

import { FC } from 'react';
import { useTheme } from 'next-themes';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// Dades de mostra per al gràfic. En un futur, això hauria de venir de la teva base de dades.
const sampleData = [
  { day: 'Dill', Trucades: 4, Emails: 8, Reunions: 2 },
  { day: 'Dim', Trucades: 3, Emails: 5, Reunions: 1 },
  { day: 'Dix', Trucades: 6, Emails: 12, Reunions: 3 },
  { day: 'Dij', Trucades: 5, Emails: 9, Reunions: 4 },
  { day: 'Div', Trucades: 8, Emails: 15, Reunions: 2 },
  { day: 'Dis', Trucades: 1, Emails: 3, Reunions: 0 },
  { day: 'Diu', Trucades: 0, Emails: 1, Reunions: 0 },
];

export const SalesActivityChart: FC = () => {
    const { theme } = useTheme();
    const gridColor = theme === 'dark' ? '#374151' : '#e5e7eb';
    const textColor = theme === 'dark' ? '#9ca3af' : '#6b7280';

    return (
        <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sampleData} margin={{ top: 20, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                    <XAxis 
                        dataKey="day" 
                        fontSize={12} 
                        tickLine={false} 
                        axisLine={false}
                        stroke={textColor}
                    />
                    <Tooltip
                        cursor={{ fill: 'hsl(var(--muted))' }}
                        contentStyle={{
                            background: "hsl(var(--card))",
                            borderColor: "hsl(var(--border))",
                            borderRadius: "var(--radius)",
                            boxShadow: "var(--shadow-md)",
                        }}
                    />
                    <Bar dataKey="Emails" stackId="a" fill="#3b82f6" name="Emails" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Trucades" stackId="a" fill="#8b5cf6" name="Trucades" />
                    <Bar dataKey="Reunions" stackId="a" fill="#f59e0b" name="Reunions" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};