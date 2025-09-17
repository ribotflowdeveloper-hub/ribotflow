/**
 * @file StatusBadge.tsx
 * @summary Muestra una etiqueta de estado coloreada y traducida. Reutilizable para presupuestos, oportunidades, etc.
 */
"use client";

import { FC } from 'react';
import { useTranslations } from 'next-intl';

export const StatusBadge: FC<{ status?: string | null }> = ({ status }) => {
    const t = useTranslations('ContactDetailPage.status');
    
    // 1. Establecemos valores por defecto para el texto y el color.
    let colorClass = 'bg-muted text-muted-foreground';
    let text = status || t('notAvailable');

    // 2. Usamos el 'switch' para asignar el texto traducido y el color a la vez,
    //    basándonos en el valor que viene de la base de datos.
    switch (status?.toLowerCase()) {
        case 'draft':
            text = t('draft');
            colorClass = 'bg-yellow-500/10 text-yellow-500';
            break;
        case 'sent':
            text = t('sent');
            colorClass = 'bg-blue-500/10 text-blue-500';
            break;
        case 'accepted':
        case 'guanyat': // Mantenemos alias si vienen de la BD
        case 'paid':
            text = t('wonPaid');
            colorClass = 'bg-green-500/10 text-green-500';
            break;
        case 'declined':
        case 'perdut':
            text = t('rejected');
            colorClass = 'bg-red-500/10 text-red-500';
            break;
        case 'negociació':
            text = t('negotiation');
            colorClass = 'bg-purple-500/10 text-purple-500';
            break;
        case 'overdue':
            text = t('overdue');
            colorClass = 'bg-orange-500/10 text-orange-500';
            break;
    }

    // 3. Renderizamos el resultado final.
    return <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${colorClass}`}>{text}</span>;
};