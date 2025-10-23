// src/app/[locale]/(app)/crm/general/_components/KpiItem.tsx

"use client";

import { FC } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const TrendIndicator: FC<{ trend: number }> = ({ trend }) => {
    const isPositive = trend > 0;
    const isNeutral = trend === 0 || isNaN(trend);
    const color = isNeutral ? 'text-gray-500' : isPositive ? 'text-green-500' : 'text-red-500';
    const Icon = isNeutral ? Minus : isPositive ? ArrowUpRight : ArrowDownRight;
    const formattedTrend = isNeutral ? '-' : `${isPositive ? '+' : ''}${trend.toFixed(1)}%`;

    return (
        <span className={cn("flex items-center text-xs font-semibold", color)}>
            <Icon className="h-3 w-3 mr-0.5" />
            {formattedTrend}
        </span>
    );
};

interface KpiItemProps {
  title: string;
  value: string | number;
  trend: number;
  tooltip: string;
}

export const KpiItem: FC<KpiItemProps> = ({ title, value, trend, tooltip }) => (
    <TooltipProvider delayDuration={150}>
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="group cursor-pointer">
                    <p className="text-xs text-muted-foreground truncate">{title}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-xl lg:text-2xl font-bold text-foreground">{value}</p>
                        <TrendIndicator trend={trend} />
                    </div>
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
);