"use client";

import React, { useState, FC, ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
import { 
    Users, TrendingUp, DollarSign, UserCheck, AlertTriangle, Crown, Calendar, 
    BarChart3, Activity, BookOpen, Check, Mail, 
    Loader2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
// 'date-fns' és una llibreria excel·lent per al format de dates.
import { formatDistanceToNow } from 'date-fns';
// Importem el tipus de dades principal des de la pàgina del servidor.
import { CrmData } from '../page';
import ComposeEmailDialog from '@/app/[locale]/(app)/crm/general/_components/ComposeEmailDialog';
import { useTranslations, useLocale } from 'next-intl';
import { ca, es, enUS } from 'date-fns/locale';

// --- Sub-components interns per a una millor organització ---

/**
 * Targeta d'estadística (KPI) reutilitzable. Mostra un valor clau, una icona i un títol.
 * @param {ElementType} icon - El component de la icona (ex: Users).
 * @param {string} title - El títol de la mètrica (ex: "Total Contacts").
 * @param {string | number} value - El valor a mostrar.
 * @param {string} color - Classe de color de Tailwind CSS per a la icona i l'efecte de fons.
 * @param {string} tooltip - Text que apareix en passar el ratolí per sobre.
 * @param {string} linkTo - La pàgina a la qual navega en fer clic.
 */
// --- Sub-components ---
const StatCard: FC<{ icon: ElementType; title: string; value: string | number; color: string; tooltip: string; linkTo: string; }> = ({ icon: Icon, title, value, color, tooltip, linkTo }) => (
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
/**
 * Barra de progrés per a l'embut de vendes (funnel).
 * Mostra visualment una quantitat respecte a un valor màxim.
 */
const FunnelBar: FC<{ label: string; value: number; maxValue: number; color: string; icon: ElementType; }> = ({ label, value, maxValue, color, icon: Icon }) => {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    return (
        <div className="flex items-center gap-4 group">
            <div className={`w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-lg bg-${color}-500/10 ring-1 ring-${color}-500/20`}><Icon className={`w-6 h-6 text-${color}-400`} /></div>
            <div className="w-full">
                <div className="flex justify-between items-center mb-1"><span className="text-sm font-medium">{label}</span><span className="text-sm font-bold">{value}</span></div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <motion.div className={`h-full rounded-full bg-gradient-to-r from-${color}-500 to-${color}-400`} initial={{ width: 0 }} animate={{ width: `${percentage}%` }} transition={{ duration: 0.8, ease: "easeOut" }} />
                </div>
            </div>
        </div>
    );
};
/**
 * Element de llista genèric per a rànquings com "Top Clients" o "Best Months".
 */
const ListItem: FC<{ href: string; icon: ElementType; iconColor: string; title: string; subtitle?: string; value?: string }> = ({ href, icon: Icon, iconColor, title, subtitle, value }) => (
    <Link href={href} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors">
        <div className="p-2 rounded-lg bg-white/5"><Icon className={`w-5 h-5 ${iconColor}`} /></div>
        <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{title}</p>
            {subtitle && <p className="text-sm text-muted-foreground truncate">{subtitle}</p>}
        </div>
        {value && <div className="font-semibold text-right">{value}</div>}
    </Link>
);
/**
 * Mostra una alerta d'activitat no llegida a la secció "Recent Alerts".
 * Gestiona el marcatge com a llegit i l'opció de respondre.
 */
const ActivityItem: FC<{ activity: CrmData['unreadActivities'][0]; onMarkAsRead: (id: string) => void; onReply: (activity: CrmData['unreadActivities'][0]) => void; }> = ({ activity, onMarkAsRead, onReply }) => {
    const t = useTranslations('CrmGeneralPage');
    const locale = useLocale();
    const router = useRouter();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;

    const handleClick = () => {
        onMarkAsRead(activity.id);
        if (activity.contact_id) router.push(`/crm/contactes/${activity.contact_id}`);
    };
    
    return (
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors group">
        <div className="p-2 rounded-lg bg-white/5"><AlertTriangle className="w-5 h-5 text-yellow-400" /></div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
            <p className="font-semibold truncate">{activity.type} - <span className="font-normal">{activity.contact_name}</span></p>
            <p className="text-sm text-muted-foreground truncate italic">"{activity.content}"</p>
        </div>
        <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: dateLocale })}</div>
        <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={(e) => { e.stopPropagation(); onReply(activity); }}>
                    <Mail className="w-4 h-4 text-blue-400" />
                </Button>
            </TooltipTrigger><TooltipContent><p>{t('replyTooltip')}</p></TooltipContent></Tooltip></TooltipProvider>
            <TooltipProvider><Tooltip><TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={(e) => { e.stopPropagation(); onMarkAsRead(activity.id); }}>
                    <Check className="w-4 h-4 text-green-400" />
                </Button>
            </TooltipTrigger><TooltipContent><p>{t('markAsReadTooltip')}</p></TooltipContent></Tooltip></TooltipProvider>
        </div>
    </div>
    );
};
/**
 * Component de Client principal per al panell del CRM.
 * Rep les dades inicials del servidor i gestiona tota la interactivitat de l'usuari:
 * - Marcar alertes com a llegides.
 * - Obrir el diàleg per respondre a una alerta.
 * - Renderitzar totes les estadístiques i llistes.
 */
export function CrmClient({ initialData }: { initialData: CrmData | null }) {
    // Hooks de React per a la gestió de l'estat i la navegació.
    const t = useTranslations('CrmGeneralPage');
    const locale = useLocale();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;
    const numberLocale = locale === 'ca' ? 'ca-ES' : 'es-ES';
    
    const supabase = createClient();
    const router = useRouter();
    const [data, setData] = useState(initialData);
    
    interface ComposeInitialData {
        contactId: string;
        to: string;
        subject: string;
        body: string;
      }
      // Estat per controlar el diàleg de composició de correu.
      const [composeState, setComposeState] = useState<{
        open: boolean;
        initialData: ComposeInitialData | null;
      }>({ open: false, initialData: null });
      /**
     * Marca una activitat com a llegida.
     * Fa una "actualització optimista": elimina l'alerta de la UI a l'instant,
     * i després fa la crida a la base de dades. Si falla, refresca per revertir el canvi.
     */
    const handleMarkAsRead = async (activityId: string) => {
        // Elimina l'activitat de l'estat local per a una resposta visual immediata.
        setData(prevData => prevData ? ({ ...prevData, unreadActivities: prevData.unreadActivities.filter(a => a.id !== activityId) }) : null);
        
        // Crida a la base de dades per actualitzar l'estat real.
        const { error } = await supabase.from('activities').update({ is_read: true }).eq('id', activityId);
        if (error) {
            toast.error(t('toast.errorTitle'), { description: t('toast.markAsReadError') });
            router.refresh();// Si falla, refresca per sincronitzar amb la base de dades.
        }
    };
  /**
     * Prepara i obre el diàleg per respondre a una activitat.
     * Construeix un cos de correu inicial citant el missatge original.
     */
    const handleReply = (activity: CrmData['unreadActivities'][0]) => {
        const date = new Date(activity.created_at).toLocaleDateString(locale);
        const content = activity.content.replace(/\n/g, '\n>');
        const quotedBody = t('replyBody', { date, content });
        
        setComposeState({ 
            open: true, 
            initialData: { 
                contactId: activity.contact_id,
                to: activity.contact_email, 
                subject: t('toast.replySubject'), 
                body: quotedBody 
            } 
        });
    };
    
    // Si les dades encara no han arribat del servidor, mostra un indicador de càrrega.
    if (!data) return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
    
    // Calculem el valor màxim de l'embut per a les barres de progrés.
    const funnelMax = Math.max(data.funnel.leads, data.funnel.quoted, data.funnel.clients, 1);
    
    // Renderitzat del JSX. S'utilitzen els sub-components definits a dalt per mantenir el codi net.
    return (
        <>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {/* Secció d'alertes recents (només si n'hi ha) */}
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
                    <StatCard icon={Users} title={t('totalContacts')} value={data.stats.totalContacts} color="text-blue-400" linkTo="/crm/contactes" tooltip="All contacts in your CRM" />
                    <StatCard icon={UserCheck} title={t('newThisMonth')} value={data.stats.newContactsThisMonth} color="text-green-400" linkTo="/crm/contactes" tooltip="Contacts added in the last 30 days" />
                    <StatCard icon={TrendingUp} title={t('opportunities')} value={data.stats.opportunities} color="text-purple-400" linkTo="/crm/pipeline" tooltip="Active opportunities" />
                    <StatCard icon={DollarSign} title={t('pipelineValue')} value={`€${(data.stats.pipelineValue).toLocaleString('en-US')}`} color="text-orange-400" linkTo="/crm/pipeline" tooltip="Sum of all active opportunity values" />
                </div>
                
                {/* Gràfic d'embut de vendes i llistes de rànquing */}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-card p-6">
                    <h2 className="text-xl font-bold mb-4">{t('customerLifecycle')}</h2>
                    <div className="space-y-6">
                            <FunnelBar label={t('leads')} value={data.funnel.leads} maxValue={funnelMax} color="purple" icon={TrendingUp} />
                            <FunnelBar label={t('quoted')} value={data.funnel.quoted} maxValue={funnelMax} color="blue" icon={BookOpen} />
                            <FunnelBar label={t('clients')} value={data.funnel.clients} maxValue={funnelMax} color="green" icon={UserCheck} />
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="glass-card p-6">
                        <h2 className="text-xl font-bold mb-4">{t('topClients')}</h2>
                        <div className="space-y-2">
                                {data.topClients?.length > 0 ? (
                                    data.topClients.map((client, index) => <ListItem key={client.id} href={`/crm/contactes/${client.id}`} icon={Crown} iconColor={index === 0 ? 'text-yellow-400' : 'text-gray-400'} title={client.nom} value={`€${(client.total_invoiced).toLocaleString('en-US')}`} />)
                                ) : <p className="text-sm text-muted-foreground text-center py-4">{t('noRevenueData')}</p>}
                            </div>
                        </div>
                        <div className="glass-card p-6">
                        <h2 className="text-xl font-bold mb-4">{t('healthRadar')}</h2>
                        <div className="space-y-2">
                                {data.coldContacts?.length > 0 ? (
                                    data.coldContacts.map(contact => <ListItem key={contact.id} href={`/crm/contactes/${contact.id}`} icon={AlertTriangle} iconColor="text-yellow-400" title={contact.nom} subtitle={t('lastContactOn', { date: new Date(contact.last_interaction_at).toLocaleDateString(locale) })} />)
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
                                {data.bestMonths?.length > 0 ? (
                                    data.bestMonths.map(month => <ListItem key={month.month} href="#" icon={Calendar} iconColor="text-green-400" title={new Date(month.month + '-02').toLocaleString(locale, { month: 'long', year: 'numeric' })} value={`€${(month.total).toLocaleString(numberLocale)}`} />)
                                ) : <p className="text-sm text-muted-foreground">{t('noRevenueHistory')}</p>}
                            </div>
                         </div>
                         <div>
                            <h3 className="font-semibold mb-3">{t('overallPerformance')}</h3>
                            <div className="space-y-2">
                            <ListItem 
                                href="#" 
                                icon={BarChart3} 
                                iconColor="text-blue-400" 
                                title={t('avgRevenuePerClient')} 
                                // ✅ Afegeix un valor per defecte de 0 si la dada no arriba
                                value={`€${(data.stats.avgRevenuePerClient || 0).toLocaleString(numberLocale)}`} 
                            />
                            <ListItem 
                                href="#" 
                                icon={Activity} 
                                iconColor="text-purple-400" 
                                title={t('avgConversionTime')} 
                                // ✅ Afegeix un valor per defecte de 0 aquí també
                                value={`${data.stats.avgConversionTimeDays || 0} d`} 
                            />
                            </div>
                        </div>
                       </div>
                   </div>
            </motion.div>
            
            {/* El diàleg per compondre correus, que es mostra o s'amaga segons l'estat 'composeState' */}

            <ComposeEmailDialog 
                open={composeState.open}
                onOpenChange={(isOpen) =>
                    setComposeState({
                    open: isOpen,
                    initialData: isOpen ? composeState.initialData : null,
                    })
                }
                initialData={composeState.initialData}
                onEmailSent={() => {}}
                />

        </>
    );
}