"use client";

import { FC, ElementType } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface StatCardProps {
    icon: ElementType;
    title: string;
    value: string | number;
    color: string;
    linkTo: string;
    tooltip: string;
    stats: {
        totalContacts: number;
        newContactsThisMonth: number;
    };
}

export const StatCard: FC<StatCardProps> = ({ icon: Icon, title, value, color, linkTo, tooltip }) => (
    <TooltipProvider delayDuration={100}>
        <Tooltip>
            <TooltipTrigger asChild>
                <motion.div whileHover={{ y: -5 }}>
                    <Link href={linkTo} className="block p-6 rounded-xl border bg-card shadow-md hover:shadow-xl transition-shadow h-full">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-sm font-semibold text-muted-foreground">{title}</p>
                            <div className={cn("p-2 rounded-lg", color.replace('text-', 'bg-') + '/10 dark:' + color.replace('text-', 'bg-') + '/20')}>
                                <Icon className={cn("w-5 h-5", color)} />
                            </div>
                        </div>
                        <p className="text-4xl font-bold text-foreground">{value}</p>
                    </Link>
                </motion.div>
            </TooltipTrigger>
            <TooltipContent><p>{tooltip}</p></TooltipContent>
        </Tooltip>
    </TooltipProvider>
);