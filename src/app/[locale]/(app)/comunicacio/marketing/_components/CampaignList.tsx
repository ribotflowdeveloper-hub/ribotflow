// /app/(app)/comunicacio/marketing/_components/CampaignList.tsx
"use client";

import React, { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import type { Campaign } from './MarketingData'; // Aquest import és correcte

// ✅ CORRECCIÓ: Afegim un 'fallback' per a 'null'
const statusColors: Record<string, string> = { 
    'Completat': 'bg-green-500/20 text-green-300', 
    'Actiu': 'bg-blue-500/20 text-blue-300', 
    'Planificat': 'bg-yellow-500/20 text-yellow-300',
    'default': 'bg-gray-500/20 text-gray-300' // Un color per defecte
};

interface CampaignListProps {
  campaigns: Campaign[];
  onCampaignSelect: (campaign: Campaign) => void;
}

export const CampaignList: FC<CampaignListProps> = ({ campaigns, onCampaignSelect }) => {
  const t = useTranslations('Marketing');
  const locale = useLocale();
  
  const getDateLocale = () => {
    switch(locale) {
      case 'es': return es;
      case 'en': return enUS;
      default: return ca;
    }
  }

  return (
    <div className="glass-effect rounded-xl overflow-hidden">
      <table className="w-full text-left">
        <thead className="bg-white/5"><tr className="border-b border-border"><th className="p-4 font-semibold">{t('campaignListHeader')}</th><th className="p-4 font-semibold hidden md:table-cell">{t('typeListHeader')}</th><th className="p-4 font-semibold">{t('statusListHeader')}</th><th className="p-4 font-semibold hidden md:table-cell">{t('dateListHeader')}</th></tr></thead>
        <tbody>
          {campaigns.map(c => (
            <tr key={c.id} className="border-t border-white/10 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => onCampaignSelect(c)}>
              <td className="p-4 font-medium">{c.name}</td>
              <td className="p-4 text-gray-300 hidden md:table-cell">{c.type}</td>
              <td className="p-4">
                {/* ✅ CORRECCIÓ: Gestionem 'c.status' que pot ser 'null' */}
                <Badge 
                    className={statusColors[c.status ?? 'default'] || statusColors['default']} 
                    variant={undefined}
                >
                    {c.status ?? 'N/A'}
                </Badge>
              </td>
              <td className="p-4 text-gray-300 hidden md:table-cell">{format(new Date(c.campaign_date), "d MMM, yyyy", { locale: getDateLocale() })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};