"use client";

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
// ❌ Ja no necessitem 'Card', 'CardHeader', etc.
// import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { type Database } from '@/types/supabase';
import { DollarSign, BarChart, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

// ✅ 1. Importem el component 'ModuleCard' que m'has passat
import { ModuleCard } from '@/components/shared/ModuleCard';

// Tipus per a les dades relacionades
type Quote = Database['public']['Tables']['quotes']['Row'];
type Opportunity = Database['public']['Tables']['opportunities']['Row'];
type Invoice = Database['public']['Tables']['invoices']['Row'];
type Activity = Database['public']['Tables']['activities']['Row'];
export type RelatedData = {
    quotes: Quote[];
    opportunities: Opportunity[];
    invoices: Invoice[];
    activities: Activity[];
};

interface ContactSummaryDashboardProps {
    relatedData: RelatedData;
}

// ❌ 2. Eliminem el component intern 'SummaryStatCard'
// const SummaryStatCard: React.FC<{ ... }> = ...

/**
 * El "Dashboard" de resum per a un contacte específic.
 * Ara fet amb ModuleCard.
 */
export function ContactSummaryDashboard({ relatedData }: ContactSummaryDashboardProps) {
    const t = useTranslations('ContactDetailPage');

    // ✅ 3. La lògica de càlcul es manté exactament igual
    const stats = useMemo(() => {
        // 1. Valor total (Oportunitats guanyades)
        const totalValue = relatedData.opportunities
            .filter(op => op.stage_name === 'Guanyat' && op.value)
            .reduce((sum, op) => sum + (op.value || 0), 0);

        // 2. Oportunitats obertes
        const openOpportunities = relatedData.opportunities
            .filter(op => op.stage_name !== 'Guanyat' && op.stage_name !== 'Perdut');
            
        const openValue = openOpportunities.reduce((sum, op) => sum + (op.value || 0), 0);

        // 3. Total d'Activitats
        const totalActivities = relatedData.activities.length;
            
        // 4. Total Facturat (Pagat) - Utilitzem total_amount (de l'esquema)
        const totalInvoiced = relatedData.invoices
            .filter(inv => inv.status === 'Paid' && inv.total_amount)
            .reduce((sum, inv) => sum + (inv.total_amount || 0), 0);

        return {
            totalValue,
            openOpportunitiesCount: openOpportunities.length,
            openValue,
            totalActivities,
            totalInvoiced,
        };
    }, [relatedData]);

    const formatCurrency = (value: number) => {
        return `€${value.toLocaleString('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    // ✅ 4. Refactoritzem el JSX per utilitzar ModuleCard
    return (
        <motion.div 
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
        >
            <ModuleCard
                title={t('summary.totalValue')}
                icon={DollarSign}
                variant="success" // Variant verd
                isCollapsible={false} // No volem que es pugui tancar
            >
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-muted-foreground">{t('summary.wonOpportunities')}</p>
            </ModuleCard>

            <ModuleCard
                title={t('summary.openOpportunities')}
                icon={BarChart}
                variant="sales" // Variant blau
                isCollapsible={false}
            >
                <div className="text-2xl font-bold">{stats.openOpportunitiesCount}</div>
                <p className="text-xs text-muted-foreground">
                    {`${t('summary.potentialValue')} ${formatCurrency(stats.openValue)}`}
                </p>
            </ModuleCard>

            <ModuleCard
                title={t('summary.totalActivities')}
                icon={Clock}
                variant="activity" // Variant taronja
                isCollapsible={false}
            >
                <div className="text-2xl font-bold">{stats.totalActivities}</div>
                <p className="text-xs text-muted-foreground">{t('summary.totalInteractions')}</p>
            </ModuleCard>
            
            <ModuleCard
                title={t('summary.totalInvoiced')}
                icon={CheckCircle}
                variant="invoices" // Variant vermell/lila
                isCollapsible={false}
            >
                <div className="text-2xl font-bold">{formatCurrency(stats.totalInvoiced)}</div>
                <p className="text-xs text-muted-foreground">{t('summary.paidInvoices')}</p>
            </ModuleCard>

        </motion.div>
    );
}