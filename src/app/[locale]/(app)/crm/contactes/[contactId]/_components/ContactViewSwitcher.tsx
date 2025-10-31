"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Activity, Briefcase, FileText, Receipt, User, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
// Assegura't que aquesta ruta sigui correcta per al teu projecte
import { type RelatedData } from './tabs/ContactSummaryDashboard'; 
import { cn } from '@/lib/utils/utils';

export type ContactViewKey = 'summary' | 'activities' | 'opportunities' | 'quotes' | 'invoices' | 'details';

interface ContactViewSwitcherProps {
    relatedData: RelatedData;
    activeView: ContactViewKey;
    onViewChange: (view: ContactViewKey) => void;
    disabled?: boolean;
}

// Component intern per a cada targeta de mòdul
const ModuleCard: React.FC<{
    title: string;
    count: number;
    icon: React.ElementType;
    colorClass: string; 
    isActive: boolean;
    onClick: () => void;
    disabled?: boolean;
}> = ({ title, count, icon: Icon, colorClass, isActive, onClick, disabled }) => (
    <Button 
        // ✅ --- AQUESTA ÉS LA CORRECCIÓ CLAU ---
        type="button" 
        // ✅ --- FI DE LA CORRECCIÓ ---
        variant={isActive ? "secondary" : "outline"} 
        className={cn(
            "h-full w-full flex flex-col items-center justify-center p-4 gap-2 relative transition-all duration-200",
            isActive ? 'shadow-md border-primary' : 'hover:bg-muted/50',
            disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={onClick}
        disabled={disabled}
    >
        <div className={cn("p-3 rounded-full", isActive ? colorClass : "bg-muted")}>
            <Icon className={cn("h-6 w-6", isActive ? "text-white" : "text-primary")} />
        </div>
        <span className="font-semibold text-base">{title}</span>
        {count > 0 && (
            <span className="text-muted-foreground text-sm">{count}</span>
        )}
        {isActive && (
            <motion.div 
                layoutId="activeContactModule" 
                className={cn("absolute bottom-0 left-0 right-0 h-1.5 rounded-t-full", colorClass)}
            />
        )}
    </Button>
);

export function ContactViewSwitcher({ relatedData, activeView, onViewChange, disabled }: ContactViewSwitcherProps) {
    const t = useTranslations('ContactDetailPage.tabs');

    const modules = [
        { key: 'summary', title: t('summary'), icon: LayoutDashboard, count: 0, color: 'bg-indigo-500' },
        { key: 'activities', title: t('activities'), icon: Activity, count: relatedData.activities.length, color: 'bg-blue-500' },
        { key: 'opportunities', title: t('opportunities'), icon: Briefcase, count: relatedData.opportunities.length, color: 'bg-green-500' },
        { key: 'quotes', title: t('quotes'), icon: FileText, count: relatedData.quotes.length, color: 'bg-orange-500' },
        { key: 'invoices', title: t('invoices'), icon: Receipt, count: relatedData.invoices.length, color: 'bg-purple-500' },
        { key: 'details', title: t('details'), icon: User, count: 0, color: 'bg-gray-500' },
    ];

    return (
        <div className="px-4 md:px-6 py-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {modules.map(mod => (
                    <ModuleCard
                        key={mod.key}
                        title={mod.title}
                        icon={mod.icon}
                        count={mod.count}
                        colorClass={mod.color}
                        isActive={activeView === mod.key}
                        onClick={() => onViewChange(mod.key as ContactViewKey)}
                        disabled={disabled}
                    />
                ))}
            </div>
        </div>
    );
}