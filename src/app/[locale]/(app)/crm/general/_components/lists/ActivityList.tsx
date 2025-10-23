// src/app/[locale]/(app)/crm/general/_components/lists/ActivityList.tsx

"use client";

import { FC } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { formatDistanceToNow } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { AlertTriangle, Mail, Check } from 'lucide-react';
import { DashboardCard } from '@/app/[locale]/(app)/dashboard/_components/DashboardCard';
import { Button } from '@/components/ui/button';
import { type UnreadActivity } from '../CrmData';

// Component intern per a cada ítem
const ActivityItem: FC<{ activity: UnreadActivity; onMarkAsRead: (id: number) => void; onReply: (activity: UnreadActivity) => void; }> = ({ activity, onMarkAsRead, onReply }) => {
    const locale = useLocale();
    const router = useRouter();
    const dateLocale = { ca, es, en: enUS }[locale] || ca;

    const handleClick = () => {
        onMarkAsRead(activity.id);
        if (activity.contact_id) {
            router.push(`/${locale}/crm/contactes/${activity.contact_id}`);
        }
    };

    return (
        <div className="flex items-center gap-4 p-2 -mx-2 rounded-lg hover:bg-muted dark:hover:bg-muted/50 transition-colors group">
            <div className="p-2.5 rounded-lg bg-yellow-500/10 dark:bg-yellow-800/20">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
                <p className="font-semibold truncate text-foreground">{activity.type} - <span className="font-normal text-muted-foreground">{activity.contacts?.nom}</span></p>
                <p className="text-sm text-muted-foreground truncate italic">"{activity.content}"</p>
            </div>
            <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">
                {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: dateLocale }) : ''}
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={(e) => { e.stopPropagation(); onReply(activity); }}>
                    <Mail className="w-4 h-4 text-blue-500" />
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 rounded-full" onClick={(e) => { e.stopPropagation(); onMarkAsRead(activity.id); }}>
                    <Check className="w-4 h-4 text-green-500" />
                </Button>
            </div>
        </div>
    );
};


interface ActivityListProps {
    activities: UnreadActivity[];
    onMarkAsRead: (id: number) => void;
    onReply: (activity: UnreadActivity) => void;
}

export const ActivityList: FC<ActivityListProps> = ({ activities, onMarkAsRead, onReply }) => {
    const t = useTranslations('CrmGeneralPage');

    if (!activities || activities.length === 0) {
        return null; // No renderitzem res si no hi ha activitats
    }

    return (
        <DashboardCard title={t('recentAlerts', { count: activities.length })} icon={AlertTriangle} variant="activity">
            <div className="space-y-1 max-h-72 overflow-y-auto pr-2 -mr-4">
                {activities.map(activity => (
                    <ActivityItem key={activity.id} activity={activity} onMarkAsRead={onMarkAsRead} onReply={onReply} />
                ))}
            </div>
        </DashboardCard>
    );
};