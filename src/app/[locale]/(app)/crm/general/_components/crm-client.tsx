"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Users, TrendingUp, DollarSign, UserCheck, AlertTriangle, Crown, Calendar, BarChart3, Activity, FileText } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { type CrmData, type ComposeEmailData } from '@/types/crm';
import { StatCard } from './StatCard';
import { FunnelBar } from './FunnelBar';
import { ListItem } from './ListItem';
import { ActivityItem } from './ActivityItem';
import ComposeEmailDialog from './ComposeEmailDialog';

interface CrmClientProps {
    initialData: CrmData | null;
}

export function CrmClient({ initialData }: CrmClientProps) {
    // ✅ PAS 1: Cridem TOTS els Hooks a l'inici, sense condicions.
    const t = useTranslations('CrmGeneralPage');
    const locale = useLocale();
    const router = useRouter();
    const supabase = createClient();
    const [data, setData] = useState(initialData);
    const [composeState, setComposeState] = useState<{ open: boolean; initialData: ComposeEmailData | null; }>({ open: false, initialData: null });

    // ✅ PAS 2: ARA SÍ, un cop tots els Hooks s'han cridat, fem la comprovació.
    // Utilitzem la variable d'estat 'data' en lloc de la prop 'initialData'.
    if (!data) {
        return (
            <div className="flex flex-col justify-center items-center h-full text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h2 className="text-xl font-bold">{t('toast.errorTitle')}</h2>
                <p className="text-muted-foreground">{t('toast.fetchError')}</p>
            </div>
        );
    }

    const handleMarkAsRead = async (activityId: string) => {
        if (!data) return;
        setData({ ...data, unreadActivities: data.unreadActivities.filter(a => a.id !== activityId) });
        const { error } = await supabase.from('activities').update({ is_read: true }).eq('id', activityId);
        if (error) {
            toast.error(t('toast.errorTitle'), { description: t('toast.markAsReadError') });
            router.refresh();
        }
    };

    const handleReply = (activity: CrmData['unreadActivities'][0]) => {
        const date = new Date(activity.created_at).toLocaleDateString(locale);
        const content = activity.content.replace(/\n/g, '\n> ');
        const quotedBody = t('replyBody', { date, content });

        setComposeState({
            open: true,
            initialData: {
                contactId: activity.contact_id || '',
                to: activity.contact_email || '',
                subject: t('toast.replySubject'),
                body: quotedBody
            }
        });
    };

    const funnelMax = Math.max(data.funnel.leads, data.funnel.quoted, data.funnel.clients, 1);

    return (
        <>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Secció d'alertes recents */}
                {data.unreadActivities && data.unreadActivities.length > 0 && (

                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold mb-4">{t('recentAlerts', { count: data.unreadActivities.length })}</h2>
                        <div className="space-y-2">
                            {data.unreadActivities.map(activity => (
                                <ActivityItem key={activity.id} activity={activity} onMarkAsRead={handleMarkAsRead} onReply={handleReply} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Targetes de KPIs principals */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={Users} title={t('totalContacts')} value={data.stats.totalContacts} color="text-blue-400" linkTo={`/${locale}/crm/contactes`} tooltip={t('tooltips.totalContacts')} />
                    <StatCard icon={UserCheck} title={t('newThisMonth')} value={data.stats.newContactsThisMonth} color="text-green-400" linkTo={`/${locale}/crm/contactes`} tooltip={t('tooltips.newContacts')} />
                    <StatCard icon={TrendingUp} title={t('opportunities')} value={data.stats.opportunities} color="text-purple-400" linkTo={`/${locale}/crm/pipeline`} tooltip={t('tooltips.opportunities')} />
                    <StatCard icon={DollarSign} title={t('pipelineValue')} value={`€${(data.stats.pipelineValue).toLocaleString('es-ES')}`} color="text-orange-400" linkTo={`/${locale}/crm/pipeline`} tooltip={t('tooltips.pipelineValue')} />
                </div>

                {/* Gràfic d'embut de vendes i llistes de rànquing */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-card p-6">
                        <h2 className="text-xl font-bold mb-4">{t('customerLifecycle')}</h2>
                        <div className="space-y-6">
                            <FunnelBar label={t('leads')} value={data.funnel.leads} maxValue={funnelMax} color="purple" icon={TrendingUp} />
                            <FunnelBar label={t('quoted')} value={data.funnel.quoted} maxValue={funnelMax} color="blue" icon={FileText} />
                            <FunnelBar label={t('clients')} value={data.funnel.clients} maxValue={funnelMax} color="green" icon={UserCheck} />
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-bold mb-4">{t('topClients')}</h2>
                            <div className="space-y-2">
                                {data.topClients.length > 0 ? (
                                    data.topClients.map((client, index) => <ListItem key={client.id} href={`/${locale}/crm/contactes/${client.id}`} icon={Crown} iconColor={index === 0 ? 'text-yellow-400' : 'text-gray-400'} title={client.nom} value={`€${(client.total_invoiced).toLocaleString('es-ES')}`} />)
                                ) : <p className="text-sm text-muted-foreground text-center py-4">{t('noRevenueData')}</p>}
                            </div>
                        </div>
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-bold mb-4">{t('healthRadar')}</h2>
                            <div className="space-y-2">
                                {data.coldContacts.length > 0 ? (
                                    data.coldContacts.map(contact => <ListItem key={contact.id} href={`/${locale}/crm/contactes/${contact.id}`} icon={AlertTriangle} iconColor="text-yellow-400" title={contact.nom} subtitle={t('lastContactOn', { date: new Date(contact.last_interaction_at).toLocaleDateString(locale) })} />)
                                ) : <p className="text-sm text-muted-foreground text-center py-4">{t('allContactsWarm')}</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Estadístiques clau */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-bold mb-4">{t('keyStatistics')}</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <h3 className="font-semibold mb-3">{t('bestMonths')}</h3>
                            <div className="space-y-2">
                                {data.bestMonths.length > 0 ? (
                                    data.bestMonths.map(month => <ListItem key={month.month} href="#" icon={Calendar} iconColor="text-green-400" title={new Date(month.month + '-02').toLocaleString(locale, { month: 'long', year: 'numeric' })} value={`€${(month.total).toLocaleString('es-ES')}`} />)
                                ) : <p className="text-sm text-muted-foreground">{t('noRevenueHistory')}</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="font-semibold mb-3">{t('overallPerformance')}</h3>
                            <div className="space-y-2">
                                <ListItem href="#" icon={BarChart3} iconColor="text-blue-400" title={t('avgRevenuePerClient')} value={`€${(data.stats.avgRevenuePerClient || 0).toLocaleString('es-ES')}`} />
                                <ListItem href="#" icon={Activity} iconColor="text-purple-400" title={t('avgConversionTime')} value={`${data.stats.avgConversionTimeDays || 0} d`} />
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Diàleg per compondre correus */}
            <ComposeEmailDialog
                open={composeState.open}
                onOpenChange={(isOpen) => setComposeState({ open: isOpen, initialData: isOpen ? composeState.initialData : null })}
                initialData={composeState.initialData}
                onEmailSent={() => { }}
            />
        </>
    );
}