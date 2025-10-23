// src/app/[locale]/(app)/crm/general/_components/charts/RevenueForecastChart.tsx

"use client";

import { FC } from 'react';
// import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RevenueForecastChartProps {
    data: {
        monthlyForecast: number;
        currentMonthRevenue: number;
    };
}

export const RevenueForecastChart: FC<RevenueForecastChartProps> = ({ data }) => {
    const forecast = data.monthlyForecast || 0;
    const current = data.currentMonthRevenue || 0;
    const percentage = forecast > 0 ? (current / forecast) * 100 : 0;

    return (
        <div className="h-64 w-full p-4 flex flex-col justify-center">
            <div className="text-center mb-4">
                <p className="text-sm text-muted-foreground">Objectiu de Facturació Mensual</p>
                <p className="text-3xl font-bold">€{forecast.toLocaleString('es-ES', { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="w-full bg-muted rounded-full h-4 mb-2">
                <div 
                    className="bg-blue-500 h-4 rounded-full" 
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                />
            </div>
            <div className="flex justify-between text-sm font-medium">
                <span className="text-blue-500">Facturat: €{current.toLocaleString('es-ES')}</span>
                <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
            </div>
        </div>
    );
};