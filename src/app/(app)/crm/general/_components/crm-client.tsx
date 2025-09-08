"use client";

import React, { useState, useMemo, FC, ElementType } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { 
    Users, TrendingUp, DollarSign, UserCheck, AlertTriangle, Crown, Calendar, 
    BarChart3, Activity, BookOpen, Check, Mail, 
    Loader2
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';
import { ca } from 'date-fns/locale';
import { CrmData } from '../page';
import ComposeEmailDialog from '@/components/crm/ComposeEmailDialog';

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

const ActivityItem: FC<{ activity: CrmData['unreadActivities'][0]; onMarkAsRead: (id: string) => void; onReply: (activity: CrmData['unreadActivities'][0]) => void; }> = ({ activity, onMarkAsRead, onReply }) => {
    const router = useRouter();
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
            <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: ca })}</div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={(e) => { e.stopPropagation(); onReply(activity); }}>
                        <Mail className="w-4 h-4 text-blue-400" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Respond</p></TooltipContent></Tooltip></TooltipProvider>
                <TooltipProvider><Tooltip><TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={(e) => { e.stopPropagation(); onMarkAsRead(activity.id); }}>
                        <Check className="w-4 h-4 text-green-400" />
                    </Button>
                </TooltipTrigger><TooltipContent><p>Mark as read</p></TooltipContent></Tooltip></TooltipProvider>
            </div>
        </div>
    );
};

export function CrmClient({ initialData }: { initialData: CrmData | null }) {
    const { toast } = useToast();
    const supabase = createClient();
    const router = useRouter();
    const [data, setData] = useState(initialData);
    const [composeState, setComposeState] = useState<{ open: boolean; initialData: any | null }>({ open: false, initialData: null });

    const handleMarkAsRead = async (activityId: string) => {
        setData(prevData => prevData ? ({ ...prevData, unreadActivities: prevData.unreadActivities.filter(a => a.id !== activityId) }) : null);
        const { error } = await supabase.from('activities').update({ is_read: true }).eq('id', activityId);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: "No s'ha pogut marcar com a llegida." });
            router.refresh();
        }
    };

    const handleReply = (activity: CrmData['unreadActivities'][0]) => {
        const quotedBody = `\n\n\n--- En resposta al teu feedback del ${new Date(activity.created_at).toLocaleDateString('ca-ES')} ---\n>${activity.content.replace(/\n/g, '\n>')}`;
        setComposeState({ 
            open: true, 
            initialData: { 
                contactId: activity.contact_id, // <-- Passem el contactId
                to: activity.contact_email, 
                subject: `Re: El teu pressupost`, 
                body: quotedBody 
            } 
        });
    };

    if (!data) return <div className="flex justify-center items-center h-full"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;

    const funnelMax = Math.max(data.funnel.leads, data.funnel.quoted, data.funnel.clients, 1);

    return (
        <>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                {data.unreadActivities && data.unreadActivities.length > 0 && (
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-bold mb-4">Recent Alerts ({data.unreadActivities.length})</h2>
                        <div className="space-y-2">
                            {data.unreadActivities.map(activity => (
                                <ActivityItem key={activity.id} activity={activity} onMarkAsRead={handleMarkAsRead} onReply={handleReply} />
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard icon={Users} title="Total Contacts" value={data.stats.totalContacts} color="text-blue-400" linkTo="/crm/contactes" tooltip="All contacts in your CRM" />
                    <StatCard icon={UserCheck} title="New this month" value={data.stats.newContactsThisMonth} color="text-green-400" linkTo="/crm/contactes" tooltip="Contacts added in the last 30 days" />
                    <StatCard icon={TrendingUp} title="Opportunities" value={data.stats.opportunities} color="text-purple-400" linkTo="/crm/pipeline" tooltip="Active opportunities" />
                    <StatCard icon={DollarSign} title="Pipeline Value" value={`€${(data.stats.pipelineValue).toLocaleString('en-US')}`} color="text-orange-400" linkTo="/crm/pipeline" tooltip="Sum of all active opportunity values" />
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 glass-card p-6">
                        <h2 className="text-xl font-bold mb-4">Customer Lifecycle</h2>
                        <div className="space-y-6">
                            <FunnelBar label="Leads" value={data.funnel.leads} maxValue={funnelMax} color="purple" icon={TrendingUp} />
                            <FunnelBar label="Quoted" value={data.funnel.quoted} maxValue={funnelMax} color="blue" icon={BookOpen} />
                            <FunnelBar label="Clients" value={data.funnel.clients} maxValue={funnelMax} color="green" icon={UserCheck} />
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-bold mb-4">Top Clients (Revenue)</h2>
                            <div className="space-y-2">
                                {data.topClients?.length > 0 ? (
                                    data.topClients.map((client, index) => <ListItem key={client.id} href={`/crm/contactes/${client.id}`} icon={Crown} iconColor={index === 0 ? 'text-yellow-400' : 'text-gray-400'} title={client.nom} value={`€${(client.total_invoiced).toLocaleString('en-US')}`} />)
                                ) : <p className="text-sm text-muted-foreground text-center py-4">No revenue data yet.</p>}
                            </div>
                        </div>
                        <div className="glass-card p-6">
                            <h2 className="text-xl font-bold mb-4">Health Radar</h2>
                            <div className="space-y-2">
                                {data.coldContacts?.length > 0 ? (
                                    data.coldContacts.map(contact => <ListItem key={contact.id} href={`/crm/contactes/${contact.id}`} icon={AlertTriangle} iconColor="text-yellow-400" title={contact.nom} subtitle={`Last contact on ${new Date(contact.last_interaction_at).toLocaleDateString()}`} />)
                                ) : <p className="text-sm text-muted-foreground text-center py-4">All contacts are warm!</p>}
                            </div>
                        </div>
                    </div>
                </div>

                 <div className="glass-card p-6">
                       <h2 className="text-xl font-bold mb-4">Key Statistics</h2>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <div>
                           <h3 className="font-semibold mb-3">Best Months (Revenue)</h3>
                           <div className="space-y-2">
                               {data.bestMonths?.length > 0 ? (
                                   data.bestMonths.map(month => <ListItem key={month.month} href="#" icon={Calendar} iconColor="text-green-400" title={new Date(month.month + '-02').toLocaleString('en-US', { month: 'long', year: 'numeric' })} value={`€${(month.total).toLocaleString('en-US')}`} />)
                               ) : <p className="text-sm text-muted-foreground">No revenue history.</p>}
                           </div>
                         </div>
                         <div>
                           <h3 className="font-semibold mb-3">Overall Performance</h3>
                           <div className="space-y-2">
                             <ListItem href="#" icon={BarChart3} iconColor="text-blue-400" title="Average Revenue / Client" value="€0" />
                             <ListItem href="#" icon={Activity} iconColor="text-purple-400" title="Average Conversion Time" value="-" />
                           </div>
                         </div>
                       </div>
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