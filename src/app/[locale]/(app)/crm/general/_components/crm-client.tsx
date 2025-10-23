// src/app/[locale]/(app)/crm/general/_components/crm-client.tsx

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, PieChart, Zap, Clock, Megaphone, ListTodo, Crown, ShieldAlert, } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { type CrmData, type UnreadActivity, type ComposeEmailData } from './CrmData';
import { ModuleCard } from '@/components/shared/ModuleCard';
import { KpiGrid } from './kip/KipGrid';
import { SalesFunnelChart } from './charts/SalesFunnelChart'; // Corregit
import { LeadSourceChart } from './charts/LeadSourceChart';   // Corregit
import { ActivityList } from './lists/ActivityList'; // Ajusta la ruta si cal
import { TopClientsList } from './lists/TopClientsList'; // Ajusta la ruta si cal
import { HealthRadarList } from './lists/HealtRadarList'; // Ajusta la ruta si cal
import ComposeEmailDialog from './ComposeEmailDialog';
import { OpportunityAgingChart } from './charts/OpportunityAgingChart';
import { LeadSourceConversionChart } from './charts/LeadSourceConversionChart';
import { CampaignPerformanceChart } from './charts/CampaignPerformanceChart';
import { DailySummaryWidget } from './charts/DailySummaryWidget';

export function CrmClient({ initialData }: { initialData: CrmData | null }) {
    const t = useTranslations('CrmGeneralPage');
    const locale = useLocale();
    const [data, setData] = useState(initialData);
    const [composeState, setComposeState] = useState<{ open: boolean; initialData: ComposeEmailData | null; }>({ open: false, initialData: null });

    if (!data) {
        return (
            <div className="flex flex-col justify-center items-center h-full text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold">{t('toast.errorTitle')}</h2>
                <p className="text-muted-foreground">{t('toast.fetchError')}</p>
            </div>
        );
    }

    const handleMarkAsRead = async (activityId: number) => {
        if (!data) return;
        setData({ ...data, unreadActivities: data.unreadActivities.filter(a => a.id !== activityId) });
        // TODO: Cridar Server Action per actualitzar la BD
    };

    const handleReply = (activity: UnreadActivity) => {
        const date = activity.created_at ? new Date(activity.created_at).toLocaleDateString(locale) : '';
        const content = activity.content.replace(/\n/g, '\n> ');
        const quotedBody = t('replyBody', { date, content });

        setComposeState({
            open: true,
            initialData: {
                contactId: activity.contact_id ?? 0,
                to: activity.contacts?.email ?? '',
                subject: `Re: ${activity.content.substring(0, 30)}...`,
                body: quotedBody
            }
        });
    };



   return (
        <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-6">
                
                {/* --- FILA SUPERIOR: KPIs (3/4) + Alertes (1/4) --- */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <div className="lg:col-span-3">
                        <ModuleCard title={t('keyMetrics')} icon={Zap} variant="info" defaultOpen={true}>
                            <KpiGrid stats={data.stats} />
                        </ModuleCard>
                    </div>
                    <div className="lg:col-span-1">
                         <ModuleCard title={t('recentAlerts', { count: data.unreadActivities.length })} icon={AlertTriangle} variant="activity">
                            <ActivityList activities={data.unreadActivities} onMarkAsRead={handleMarkAsRead} onReply={handleReply} />
                        </ModuleCard>
                    </div>
                </div>
                
                {/* --- GRAELLA INFERIOR: 2 Files de 4 Targetes Adaptatives --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Fila 1 */}
                    <ModuleCard title={t('dailySummary.title')} icon={ListTodo} variant="agenda">
                        <DailySummaryWidget data={data.dailySummary} />
                    </ModuleCard>
                    <ModuleCard title={t('opportunityAgingByStage')} icon={Clock} variant="warning">
                        <OpportunityAgingChart data={data.opportunityAging} />
                    </ModuleCard>
                    <ModuleCard title={t('campaignPerformance.title')} icon={Megaphone} variant="inbox">
                        <CampaignPerformanceChart data={data.campaignPerformance} />
                    </ModuleCard>
                    <ModuleCard title={t('topClients')} icon={Crown} variant="success">
                         <TopClientsList topClients={data.topClients} />
                    </ModuleCard>

                    {/* Fila 2 */}
                     <ModuleCard title={t('customerLifecycle')} icon={BarChart3} variant="activity">
                        <SalesFunnelChart data={data.funnel} t={t} />
                    </ModuleCard>
                    <ModuleCard title={t('leadConversionBySource')} icon={PieChart} variant="radar">
                        <LeadSourceConversionChart data={data.leadConversion} />
                    </ModuleCard>
                    <ModuleCard title={t('leadSourceAnalysis')} icon={PieChart}>
                        {data.leadSources && data.leadSources.length > 0 ? (
                            <LeadSourceChart data={data.leadSources} />
                        ) : (
                            <p className="text-muted-foreground text-sm text-center p-4">{t('noLeadSourceData')}</p>
                        )}
                    </ModuleCard>
                    <ModuleCard title={t('healthRadar')} icon={ShieldAlert} variant="radar">
                        <HealthRadarList coldContacts={data.coldContacts} />
                    </ModuleCard>
                </div>

            </motion.div>

            <ComposeEmailDialog
                open={composeState.open}
                onOpenChange={(isOpen) => setComposeState({ open: isOpen, initialData: isOpen ? composeState.initialData : null })}
                initialData={composeState.initialData}
                onEmailSent={() => {}}
            />
        </>
    );
}