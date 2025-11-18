// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/ContactSummaryDashboard.tsx
"use client";

import React, { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { DollarSign, BarChart, CheckCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { ModuleCard } from '@/components/shared/ModuleCard';
import type { ContactRelatedData } from '@/lib/services/crm/contacts/contacts.service';

interface ContactSummaryDashboardProps {
    relatedData: ContactRelatedData;
}

export function ContactSummaryDashboard({ relatedData }: ContactSummaryDashboardProps) {
    const t = useTranslations('ContactDetailPage');

    const stats = useMemo(() => {
        // 1. Oportunitats Guanyades
        const wonOpps = relatedData.opportunities.filter(op => {
            // ✅ CORRECTE: Accedim al nom de l'etapa a través de la relació
            // Com que 'pipeline_stages' pot ser null (si l'etapa s'ha esborrat), fem optional chaining
            const stageName = op.pipeline_stages?.name;
            
            // Comprova el nom exacte que tens a la BD (potser és 'Won' o 'Guanyat')
            return (stageName === 'Guanyat' || stageName === 'Won') && op.value;
        });

        const totalValue = wonOpps.reduce((sum, op) => sum + (op.value || 0), 0);

        // 2. Oportunitats Obertes (Ni Guanyat ni Perdut)
        const openOpportunities = relatedData.opportunities.filter(op => {
            const stageName = op.pipeline_stages?.name;
            return stageName !== 'Guanyat' && stageName !== 'Won' && stageName !== 'Perdut' && stageName !== 'Lost';
        });
            
        const openValue = openOpportunities.reduce((sum, op) => sum + (op.value || 0), 0);

        // 3. Activitats
        const totalActivities = relatedData.activities.length;
            
        // 4. Factures Pagades
        const totalInvoiced = relatedData.invoices
            .filter(inv => (inv.status === 'Paid' || inv.status === 'Pagada') && inv.total_amount)
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
                variant="success"
                isCollapsible={false}
            >
                <div className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</div>
                <p className="text-xs text-muted-foreground">{t('summary.wonOpportunities')}</p>
            </ModuleCard>

            <ModuleCard
                title={t('summary.openOpportunities')}
                icon={BarChart}
                variant="sales"
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
                variant="activity"
                isCollapsible={false}
            >
                <div className="text-2xl font-bold">{stats.totalActivities}</div>
                <p className="text-xs text-muted-foreground">{t('summary.totalInteractions')}</p>
            </ModuleCard>
            
            <ModuleCard
                title={t('summary.totalInvoiced')}
                icon={CheckCircle}
                variant="invoices"
                isCollapsible={false}
            >
                <div className="text-2xl font-bold">{formatCurrency(stats.totalInvoiced)}</div>
                <p className="text-xs text-muted-foreground">{t('summary.paidInvoices')}</p>
            </ModuleCard>
        </motion.div>
    );
}