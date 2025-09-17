/**
 * @file StatusBadge.tsx
 * @summary Muestra una etiqueta de estado coloreada y traducida. Reutilizable para presupuestos, oportunidades, etc.
 */
"use client";

import { FC } from 'react';
import { useTranslations } from 'next-intl';

export const StatusBadge: FC<{ status?: string | null }> = ({ status }) => {
    const t = useTranslations('ContactDetailPage.status');
    let colorClass = 'bg-muted text-muted-foreground';
    let text = status ? t(status.toLowerCase().replace('/', '') as any, {}, { defaultValue: status }) : t('notAvailable');

    // La lógica del switch determina el color basado en el valor de la base de datos.
    switch (status?.toLowerCase()) {
        case 'draft': colorClass = 'bg-yellow-500/10 text-yellow-500'; break;
        case 'sent': colorClass = 'bg-blue-500/10 text-blue-500'; break;
        case 'accepted': case 'guanyat': case 'paid': text = t('wonPaid'); colorClass = 'bg-green-500/10 text-green-500'; break;
        case 'declined': case 'perdut': text = t('rejected'); colorClass = 'bg-red-500/10 text-red-500'; break;
        case 'negociació': text = t('negotiation'); colorClass = 'bg-purple-500/10 text-purple-500'; break;
        case 'overdue': text = t('overdue'); colorClass = 'bg-orange-500/10 text-orange-500'; break;
    }
    return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${colorClass}`}>{text}</span>;
};