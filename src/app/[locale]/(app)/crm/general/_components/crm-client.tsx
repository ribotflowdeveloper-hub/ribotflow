"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, BarChart3, PieChart } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
// Importacions dels components desglossats
import { type CrmData, type UnreadActivity, type ComposeEmailData } from './CrmData';
import { DashboardCard } from '@/app/[locale]/(app)/dashboard/_components/DashboardCard';
import { StatCard } from './lists/StatCard';
import { SalesFunnelChart } from './charts/SalesFunnelChart';
import { LeadSourceChart } from './charts/LeadSourceChart';
import { ActivityList } from './lists/ActivityList';
import { TopClientsList } from './lists/TopClientsList';
import { HealthRadarList } from './lists/HealtRadarList';
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
        console.log(`Marcant activitat ${activityId} com a llegida.`);
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="space-y-8">

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <StatCard
                        icon={BarChart3}
                        title={t('stats.totalContacts')}
                        value={data.stats.totalContacts}
                        color="blue"
                        linkTo="/crm/contacts"
                        tooltip={t('tooltips.totalContacts')}
                        stats={data.stats}
                    />
                    <StatCard
                        icon={PieChart}
                        title={t('stats.newContactsThisMonth')}
                        value={data.stats.newContactsThisMonth}
                        color="green"
                        linkTo="/crm/contacts?filter=new"
                        tooltip={t('tooltips.newContactsThisMonth')}
                        stats={data.stats}
                    />
                    <StatCard
                        icon={BarChart3}
                        title={t('stats.opportunities')}
                        value={data.stats.opportunities}
                        color="orange"
                        linkTo="/crm/opportunities"
                        tooltip={t('tooltips.opportunities')}
                        stats={data.stats}
                    />
                    <StatCard
                        icon={PieChart}
                        title={t('stats.pipelineValue')}
                        value={data.stats.pipelineValue}
                        color="purple"
                        linkTo="/crm/pipeline"
                        tooltip={t('tooltips.pipelineValue')}
                        stats={data.stats}
                    />
                    <StatCard
                        icon={BarChart3}
                        title={t('stats.avgRevenuePerClient')}
                        value={data.stats.avgRevenuePerClient}
                        color="teal"
                        linkTo="/crm/clients"
                        tooltip={t('tooltips.avgRevenuePerClient')}
                        stats={data.stats}
                    />
                    <StatCard
                        icon={PieChart}
                        title={t('stats.avgConversionTimeDays')}
                        value={data.stats.avgConversionTimeDays}
                        color="red"
                        linkTo="/crm/conversions"
                        tooltip={t('tooltips.avgConversionTimeDays')}
                        stats={data.stats}
                    />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">

                    <div className="lg:col-span-2 space-y-8">
                        <ActivityList activities={data.unreadActivities} onMarkAsRead={handleMarkAsRead} onReply={handleReply} />

                        <DashboardCard title={t('customerLifecycle')} icon={BarChart3} variant="default">
                            <SalesFunnelChart data={data.funnel} t={t} />
                        </DashboardCard>
                        <DashboardCard title={t('leadSourceAnalysis')} icon={PieChart} variant="default">
                            {data.leadSources && data.leadSources.length > 0 ? (
                                <LeadSourceChart data={data.leadSources} />
                            ) : (
                                <p className="text-muted-foreground text-sm p-4">
                                    {t('noLeadSourceData', { default: 'No hi ha dades de fonts de leads.' })}
                                </p>
                            )}
                        </DashboardCard>

                    </div>

                    <div className="lg:col-span-1 space-y-8">
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