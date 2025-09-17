"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import type { Activity } from '@/types/crm'; // ✅ Assegurem que el tipus ve del fitxer central

/**
 * @summary Sub-component reutilitzable per mostrar un únic element de l'historial d'activitats.
 * Aquesta separació manté el codi més net i organitzat.
 */
const HistoricActivityItem: React.FC<{ activity: Activity }> = ({ activity }) => {
    const t = useTranslations('ActivitiesClient');
    const locale = useLocale();
    
    // Lògica per determinar l'idioma del format de la data
    const getDateLocale = () => {
        switch (locale) {
            case 'es': return es;
            case 'en': return enUS;
            default: return ca;
        }
    };

    // Determina la icona i el color segons si l'activitat ha estat llegida.
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
                    <p className="font-semibold">{activity.type} - <span className="font-normal">{activity.contacts?.nom || t('deletedContact')}</span></p>
                    <p className="text-xs text-muted-foreground">{format(new Date(activity.created_at), t('dateFormat'), { locale: getDateLocale() })}</p>
                </div>
                <p className="text-sm text-muted-foreground mt-1 italic">"{activity.content}"</p>
            </div>
        </div>
    );

    // Si l'activitat està associada a un contacte, la fem clicable.
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

    // Si no hi ha contacte associat, renderitzem un 'div' que no és un enllaç.
    return (
        <div className="block p-4">
            {activityContent}
        </div>
    );
};

// Definim les propietats que espera el component principal.
interface ActivitatsClientProps {
    initialActivities: Activity[];
}

/**
 * @summary Component de Client principal per a la pàgina d'historial d'activitats.
 * És un component "presentacional": només rep dades i les mostra.
 */
export const ActivitatsClient: React.FC<ActivitatsClientProps> = ({ initialActivities }) => {
    const t = useTranslations('ActivitiesClient');

    // ❌ ELIMINAT: Ja no necessitem la comprovació de càrrega (!initialActivities)
    // perquè aquest component només es renderitzarà quan les dades ja estiguin llestes.

    return (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">{t('title')}</h1>
            </div>

            <div className="glass-card overflow-hidden">
                {initialActivities.length > 0 ? (
                    <div className="divide-y divide-white/10">
                        {initialActivities.map(activity => (
                            <HistoricActivityItem key={activity.id} activity={activity} />
                        ))}
                    </div>
                ) : (
                    // Si no hi ha activitats, mostrem un missatge informatiu.
                    <div className="text-center p-12">
                        <p className="text-muted-foreground">{t('noActivities')}</p>
                    </div>
                )}
            </div>
        </motion.div>
    );
};