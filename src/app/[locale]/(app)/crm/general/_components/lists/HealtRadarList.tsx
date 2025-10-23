// src/app/[locale]/(app)/crm/general/_components/lists/HealthRadarList.tsx

"use client";

import { FC } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AlertTriangle, Contact } from 'lucide-react';
import { DashboardCard } from '@/app/[locale]/(app)/dashboard/_components/DashboardCard';
import { ListItem } from './ListItem';
import { type ColdContact } from '../CrmData';

interface HealthRadarListProps {
    coldContacts: ColdContact[];
}

export const HealthRadarList: FC<HealthRadarListProps> = ({ coldContacts }) => {
    const t = useTranslations('CrmGeneralPage');
    const locale = useLocale();

    return (
        <DashboardCard title={t('healthRadar')} icon={Contact} variant="default">
            <div className="space-y-1">
                {coldContacts.length > 0 ? (
                    coldContacts.map(contact => (
                        <ListItem 
                            key={contact.id} 
                            href={`/${locale}/crm/contactes/${contact.id}`} 
                            icon={AlertTriangle} 
                            iconColor="text-yellow-500" 
                            title={contact.nom || ''} 
                            subtitle={contact.last_interaction_at ? t('lastContactOn', { date: new Date(contact.last_interaction_at).toLocaleDateString(locale) }) : ''} 
                        />
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">{t('allContactsWarm')}</p>
                )}
            </div>
        </DashboardCard>
    );
};