// Ubicació: /app/(app)/comunicacio/marketing/_components/MetricCard.tsx

import React from 'react';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon }) => (
    <div className="glass-effect p-6 rounded-xl flex-1">
        <div className="flex items-center gap-4">
            <div className="bg-purple-500/20 p-3 rounded-lg">{icon}</div>
            <div>
                <p className="text-gray-300 text-sm">{title}</p>
                <p className="text-2xl font-bold">{value}</p>
            </div>
        </div>
    </div>
);