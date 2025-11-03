// /app/(app)/comunicacio/marketing/_components/CampaignList.tsx
"use client";

import React, { FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { useLocale, useTranslations } from 'next-intl';
import type { Campaign } from './MarketingData'; 

// ✅ CANVI: Definim colors per al mode clar (per defecte) i afegim variants 'dark:'.
// Ara els badges tindran alt contrast en tots dos temes.
const statusColors: Record<string, string> = { 
    'Completat': 'bg-green-100 text-green-800 border border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30',
    'Actiu': 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
    'Planificat': 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
    'default': 'bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-500/20 dark:text-gray-300 dark:border-gray-500/30'
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
    // ✅ CANVI: Reemplacem 'glass-effect' per 'bg-card' i 'border'
    <div className="bg-card border rounded-xl overflow-hidden">
      <table className="w-full text-left">
        {/* ✅ CANVI: Reemplacem 'bg-white/5' per 'bg-muted' */}
        <thead className="bg-muted">
            {/* ✅ CANVI: Usem 'border-border' */}
            <tr className="border-b border-border">
                <th className="p-4 font-semibold">{t('campaignListHeader')}</th>
                <th className="p-4 font-semibold hidden md:table-cell">{t('typeListHeader')}</th>
                <th className="p-4 font-semibold">{t('statusListHeader')}</th>
                <th className="p-4 font-semibold hidden md:table-cell">{t('dateListHeader')}</th>
            </tr>
        </thead>
        <tbody>
          {campaigns.map(c => (
            // ✅ CANVI: 'border-border' i fons 'hover:bg-muted/50' (més subtil que 'bg-muted')
            <tr 
                key={c.id} 
                className="border-t border-border hover:bg-muted/50 transition-colors cursor-pointer" 
                onClick={() => onCampaignSelect(c)}
            >
              <td className="p-4 font-medium">{c.name}</td>
              {/* ✅ CANVI: Usem 'text-muted-foreground' */}
              <td className="p-4 text-muted-foreground hidden md:table-cell">{c.type}</td>
              <td className="p-4">
                <Badge 
                    // Les classes ara s'apliquen correctament
                    className={statusColors[c.status ?? 'default'] || statusColors['default']} 
                    // Important: resetejem la variant de shadcn per aplicar els nostres estils
                    variant="outline" 
                >
                  {c.status ?? 'N/A'}
                </Badge>
              </td>
              {/* ✅ CANVI: Usem 'text-muted-foreground' */}
              <td className="p-4 text-muted-foreground hidden md:table-cell">
                  {format(new Date(c.campaign_date), "d MMM, yyyy", { locale: getDateLocale() })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};