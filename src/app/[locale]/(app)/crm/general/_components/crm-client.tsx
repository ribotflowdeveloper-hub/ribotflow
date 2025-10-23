// src/app/[locale]/(app)/crm/general/_components/crm-client.tsx

"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, PieChart, Zap } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { type CrmData, type UnreadActivity, type ComposeEmailData } from './CrmData';
import { ModuleCard } from '@/components/shared/ModuleCard';
import { KpiGrid } from './kip/KipGrid';
import { SalesFunnelChart } from './charts/SalesFunnelChart'; // Corregit
import { LeadSourceChart } from './charts/LeadSourceChart';   // Corregit
import { RevenueForecastChart } from './charts/RevenueForecastChart';
import { SalesActivityChart } from './charts/SalesActivityChart';
import { ActivityList } from './lists/ActivityList'; // Ajusta la ruta si cal
import { TopClientsList } from './lists/TopClientsList'; // Ajusta la ruta si cal
import { HealthRadarList } from './lists/HealtRadarList'; // Ajusta la ruta si cal
import ComposeEmailDialog from './ComposeEmailDialog';

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

            

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                    <div className="lg:col-span-2 space-y-6">
                        <ModuleCard title={t('keyMetrics')} icon={Zap} variant="info" defaultOpen={true}>
                            <KpiGrid stats={data.stats} />
                        </ModuleCard>
                        <ActivityList activities={data.unreadActivities} onMarkAsRead={handleMarkAsRead} onReply={handleReply} />

                        <ModuleCard title={t('revenueForecast')} icon={BarChart3}>
                            <RevenueForecastChart data={data.revenue} />
                        </ModuleCard>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <ModuleCard title={t('customerLifecycle')} icon={BarChart3}>
                                <SalesFunnelChart data={data.funnel} t={t} />
                            </ModuleCard>
                            <ModuleCard title={t('leadSourceAnalysis')} icon={PieChart}>
                                {data.leadSources && data.leadSources.length > 0 ? (
                                    <LeadSourceChart data={data.leadSources} />
                                ) : (
                                    <p className="text-muted-foreground text-sm text-center p-4">{t('noLeadSourceData')}</p>
                                )}
                            </ModuleCard>
                        </div>
                    </div>

                    <div className="lg:col-span-1 space-y-6">
                        <ModuleCard title={t('salesActivityLast7d')} icon={Zap}>
                            <SalesActivityChart />
                        </ModuleCard>
                        <TopClientsList topClients={data.topClients} />
                        <HealthRadarList coldContacts={data.coldContacts} />
                    </div>
                </div>

            </motion.div>

            <ComposeEmailDialog
                open={composeState.open}
                onOpenChange={(isOpen) => setComposeState({ open: isOpen, initialData: isOpen ? composeState.initialData : null })}
                initialData={composeState.initialData}
                onEmailSent={() => { }}
            />
        </>
    );
}