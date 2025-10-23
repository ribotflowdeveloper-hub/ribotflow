// src/app/[locale]/(app)/crm/general/_components/lists/TopClientsList.tsx

"use client";

import { FC } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Crown } from 'lucide-react';
import { ListItem } from './ListItem';
import { type TopClient } from '../CrmData';

interface TopClientsListProps {
    topClients: TopClient[];
}

export const TopClientsList: FC<TopClientsListProps> = ({ topClients }) => {
    const t = useTranslations('CrmGeneralPage');
    const locale = useLocale();

    return (
            <div className="space-y-1">
                {topClients.length > 0 ? (
                    topClients.map((client, index) => (
                        <ListItem 
                            key={client.id} 
                            href={`/${locale}/crm/contactes/${client.id}`} 
                            icon={Crown} 
                            iconColor={index === 0 ? 'text-yellow-400' : 'text-gray-400'} 
                            title={client.nom || ''} 
                            value={`€${(client.total_invoiced).toLocaleString('es-ES')}`} 
                        />
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('noRevenueData')}</p>
                )}
            </div>
    );
};