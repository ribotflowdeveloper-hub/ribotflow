// src/app/[locale]/(app)/crm/general/_components/StatCard.tsx
"use client";

import Link from 'next/link';
import { ElementType, FC } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Sub-components ---
export const StatCard: FC<{ icon: ElementType; title: string; value: string | number; color: string; tooltip: string; linkTo: string; }> = ({ icon: Icon, title, value, color, tooltip, linkTo }) => (
    <TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger asChild>
        <Link href={linkTo} className="group block relative p-6 rounded-2xl overflow-hidden ring-1 ring-white/10 bg-gradient-to-br from-white/5 to-transparent hover:bg-white/10 transition-all duration-300 hover:-translate-y-1 shadow-lg">
            <div className={`absolute -top-4 -right-4 h-24 w-24 ${color}/20 rounded-full blur-3xl opacity-70 group-hover:opacity-100 transition-opacity`}></div>
            <div className="relative z-10">
                <div className={`rounded-lg bg-white/10 p-2.5 inline-block ring-1 ring-white/10 mb-4`}><Icon className={`w-6 h-6 ${color}`} /></div>
                <p className="text-4xl font-bold">{value}</p>
                <p className="text-muted-foreground text-sm font-semibold">{title}</p>
            </div>
        </Link>
    </TooltipTrigger><TooltipContent><p>{tooltip}</p></TooltipContent></Tooltip></TooltipProvider>
);