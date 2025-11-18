// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/ContactViewSwitcher.tsx
"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Activity, Briefcase, FileText, Receipt, User, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/utils';

// Importem el tipus des del servei
import type { ContactRelatedData } from '@/lib/services/crm/contacts/contacts.service';

export type ContactViewKey = 'summary' | 'activities' | 'opportunities' | 'quotes' | 'invoices' | 'details';
export type RelatedDataKey = Extract<ContactViewKey, 'opportunities' | 'quotes' | 'invoices'>;

interface ContactViewSwitcherProps {
    relatedData: ContactRelatedData;
    activeView: ContactViewKey;
    onViewChange: (view: ContactViewKey) => void;
    disabled?: boolean;
}

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
        type="button" 
        variant={isActive ? "secondary" : "outline"} 
        className={cn(
            // ✅ CORRECCIÓ D'ESTIL:
            // 1. 'h-auto': Sobreescriu l'alçada fixa del botó per defecte.
            // 2. 'min-h-[110px]': Assegura una alçada mínima per semblar una targeta.
            // 3. 'whitespace-normal': Permet que el text faci salt de línia si cal.
            "h-auto min-h-[110px] w-full flex flex-col items-center justify-center p-4 gap-2 relative transition-all duration-200",
            isActive ? 'shadow-md border-primary bg-secondary/50' : 'hover:bg-muted/50 bg-background',
            disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={onClick}
        disabled={disabled}
    >
        <div className={cn("p-3 rounded-full transition-colors", isActive ? colorClass : "bg-muted group-hover:bg-muted/80")}>
            <Icon className={cn("h-6 w-6", isActive ? "text-white" : "text-muted-foreground")} />
        </div>
        
        <div className="flex flex-col items-center gap-0.5">
            <span className="font-semibold text-sm text-center whitespace-normal leading-tight">
                {title}
            </span>
            {count > 0 && (
                <span className="text-muted-foreground text-xs font-medium bg-muted px-2 py-0.5 rounded-full mt-1">
                    {count}
                </span>
            )}
        </div>

        {isActive && (
            <motion.div 
                layoutId="activeContactModule" 
                className={cn("absolute bottom-0 left-0 right-0 h-1 rounded-t-full mx-4 mb-1", colorClass)}
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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