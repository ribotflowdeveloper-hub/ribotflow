// /app/[locale]/(app)/crm/general/_components/ActivityItem.tsx (CORREGIT)
"use client";

import React, { FC } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { AlertTriangle, Mail, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTranslations, useLocale } from 'next-intl';
// ✅ 1. Importem el tipus correcte des de CrmData.
import { type UnreadActivity } from './CrmData';

interface ActivityItemProps {
    activity: UnreadActivity;
    onMarkAsRead: (id: number) => void;
    onReply: (activity: UnreadActivity) => void;
}

export const ActivityItem: FC<ActivityItemProps> = ({ activity, onMarkAsRead, onReply }) => {
    const t = useTranslations('CrmGeneralPage');
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
        <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/10 transition-colors group">
            <div className="p-2 rounded-lg bg-white/5">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleClick}>
                <p className="font-semibold truncate">
                    {/* ✅ 2. Accedim al nom a través de la relació. */}
                    {activity.type} - <span className="font-normal">{activity.contacts?.nom}</span>
                </p>
                <p className="text-sm text-muted-foreground truncate italic">"{activity.content}"</p>
            </div>
            <div className="text-xs text-muted-foreground shrink-0">
                {activity.created_at ? formatDistanceToNow(new Date(activity.created_at), { addSuffix: true, locale: dateLocale }) : ''}
            </div>
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 rounded-full" 
                                onClick={(e) => { e.stopPropagation(); onReply(activity); }}
                            >
                                <Mail className="w-4 h-4 text-blue-400" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{t('replyTooltip')}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="w-8 h-8 rounded-full" 
                                // ✅ 3. Passem l'ID numèric.
                                onClick={(e) => { e.stopPropagation(); onMarkAsRead(activity.id); }}
                            >
                                <Check className="w-4 h-4 text-green-400" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent><p>{t('markAsReadTooltip')}</p></TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
        </div>
    );
};