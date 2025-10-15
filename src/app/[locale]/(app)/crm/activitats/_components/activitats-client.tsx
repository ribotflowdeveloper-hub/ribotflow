// /app/[locale]/(app)/crm/activitats/_components/activitats-client.tsx

"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';

// ✅ PAS 3: Importem el tipus directament del nostre component de dades del servidor.
import { type ActivityWithContact } from './ActivitiesData';

/**
 * @summary Sub-component reutilitzable per mostrar un únic element de l'historial d'activitats.
 */
const HistoricActivityItem: React.FC<{ activity: ActivityWithContact }> = ({ activity }) => {
    const t = useTranslations('ActivitiesClient');
    const locale = useLocale();
    
    const getDateLocale = () => {
        switch (locale) {
            case 'es': return es;
            case 'en': return enUS;
            default: return ca;
        }
    };

    const isRead = activity.is_read;
    const Icon = isRead ? CheckCircle : AlertTriangle;
    const iconColor = isRead ? 'text-green-400' : 'text-yellow-400';

    const activityContent = (
        <div className="flex items-start gap-4">
            <div className="mt-1">
                <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-center">
                    {/* ✅ Adaptem l'accés a les dades: 'activity.contacts.nom' */}
                    <p className="font-semibold">{activity.type} - <span className="font-normal">{activity.contacts?.nom || t('deletedContact')}</span></p>
                    {/* ✅ Ens assegurem de gestionar el possible null de 'created_at' */}
                    <p className="text-xs text-muted-foreground">{activity.created_at ? format(new Date(activity.created_at), t('dateFormat'), { locale: getDateLocale() }) : ''}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1 italic">"{activity.content}"</p>
            </div>
        </div>
    );

    // ✅ La lògica ara utilitza 'activity.contact_id' (que és un number)
    if (activity.contact_id && activity.contacts) {
        return (
            <Link
                href={`/${locale}/crm/contactes/${activity.contact_id}`}
                className="block p-4 hover:bg-white/10 transition-colors"
            >
                {activityContent}
            </Link>
        );
    }

    return (
        <div className="block p-4">
            {activityContent}
        </div>
    );
};

interface ActivitatsClientProps {
    initialActivities: ActivityWithContact[];
}

/**
 * @summary Component de Client principal per a la pàgina d'historial d'activitats.
 */
export const ActivitatsClient: React.FC<ActivitatsClientProps> = ({ initialActivities }) => {
    const t = useTranslations('ActivitiesClient');

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
            </div>

            <div className="glass-card overflow-hidden">
                {initialActivities.length > 0 ? (
                    <div className="divide-y divide-white/10">
                        {initialActivities.map(activity => (
                            // ✅ 'activity.id' ara és un number, que és una key vàlida.
                            <HistoricActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center p-12">
                        <p className="text-muted-foreground">{t('noActivities')}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};