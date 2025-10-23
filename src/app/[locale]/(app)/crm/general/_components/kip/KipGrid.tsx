// src/app/[locale]/(app)/crm/general/_components/KpiGrid.tsx

"use client";

import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { type CrmData } from './CrmData';
import { KpiItem } from './KpiItem'; // <-- Aquest import ara funcionarà

interface KpiGridProps {
  stats: CrmData['stats'];
}

export const KpiGrid: FC<KpiGridProps> = ({ stats }) => {
  const t = useTranslations('CrmGeneralPage');

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-6 pt-2">
      <KpiItem 
        title={t('stats.totalContacts')} 
        value={stats.totalContacts.value} 
        trend={stats.totalContacts.trend}
        tooltip={t('tooltips.totalContacts')}
      />
      <KpiItem 
        title={t('stats.newContactsThisMonth')} 
        value={stats.newContactsThisMonth.value} 
        trend={stats.newContactsThisMonth.trend}
        tooltip={t('tooltips.newContactsThisMonth')}
      />
      <KpiItem 
        title={t('stats.conversionRate')} 
        value={stats.conversionRate.value} 
        trend={stats.conversionRate.trend}
        tooltip={t('tooltips.conversionRate')}
      />
      <KpiItem 
        title={t('stats.pipelineValue')} 
        value={stats.pipelineValue.value} 
        trend={stats.pipelineValue.trend}
        tooltip={t('tooltips.pipelineValue')}
      />
      <KpiItem 
        title={t('stats.salesVelocity')} 
        value={stats.salesVelocity.value} 
        trend={stats.salesVelocity.trend}
        tooltip={t('tooltips.salesVelocity')}
      />
      <KpiItem 
        title={t('stats.avgConversionTimeDays')} 
        value={stats.avgConversionTimeDays.value} 
        trend={stats.avgConversionTimeDays.trend}
        tooltip={t('tooltips.avgConversionTimeDays')}
      />
      <KpiItem 
        title={t('stats.opportunities')} 
        value={stats.opportunities.value} 
        trend={stats.opportunities.trend}
        tooltip={t('tooltips.opportunities')}
      />
       <KpiItem 
        title={t('stats.avgRevenuePerClient')} 
        value={stats.avgRevenuePerClient.value} 
        trend={stats.avgRevenuePerClient.trend}
        tooltip={t('tooltips.avgRevenuePerClient')}
      />
    </div>
  );
};