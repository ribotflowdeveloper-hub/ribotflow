/**
 * @file CampaignCalendar.tsx
 */

"use client";

import React, { useState, useMemo, FC } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ca, es, enUS } from 'date-fns/locale';
import { type Campaign } from './MarketingData'; 
import { useLocale, useTranslations } from 'next-intl';

interface CampaignCalendarProps {
  campaigns: Campaign[]; 
  onCampaignSelect: (campaign: Campaign) => void; 
}

export const CampaignCalendar: FC<CampaignCalendarProps> = ({ campaigns, onCampaignSelect }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const t = useTranslations('CampaignCalendar');
  const locale = useLocale();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); 
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const campaignsByDate = useMemo(() => {
    return campaigns.reduce((acc, campaign) => {
      const date = format(new Date(campaign.campaign_date), 'yyyy-MM-dd');
      if (!acc[date]) acc[date] = [];
      acc[date].push(campaign);
      return acc;
    }, {} as Record<string, Campaign[]>);
  }, [campaigns]);

  const getDateLocale = () => {
    switch (locale) {
      case 'es': return es;
      case 'en': return enUS;
      default: return ca;
    }
  }

  const daysOfWeek = [
    t('daysOfWeek.monday'), t('daysOfWeek.tuesday'), t('daysOfWeek.wednesday'),
    t('daysOfWeek.thursday'), t('daysOfWeek.friday'), t('daysOfWeek.saturday'),
    t('daysOfWeek.sunday')
  ];

  return (
        // ✅ CANVI: Reemplacem 'glass-effect' per 'bg-card' i 'border'
        <div className="bg-card border rounded-xl p-4">
          <div className="flex justify-between items-center mb-4">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft /></Button>
            <h3 className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: getDateLocale() })}</h3>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight /></Button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {daysOfWeek.map(day => <div key={day} className="font-bold">{day}</div>)}
          </div>
          
          <div className="grid grid-cols-7 gap-1 mt-2">
            {days.map(day => {
                // Definim els colors del dia de forma més robusta
                const isToday = isSameDay(day, new Date());
                const isCurrentMonth = isSameMonth(day, monthStart);

                // ✅ CANVI: Fons semàntics.
                // 'bg-transparent' (per al mes actual) o 'bg-muted/50' (per a dies fora del mes)
                const dayBgClass = isCurrentMonth ? 'bg-transparent' : 'bg-muted/50';
                
                // ✅ CANVI: Colors de text semàntics.
                const dayTextClass = isToday 
                    ? 'font-bold text-primary' 
                    : isCurrentMonth 
                        ? 'text-foreground' 
                        : 'text-muted-foreground';

                return (
                    <div key={day.toString()} className={`h-24 rounded-lg p-1 overflow-hidden ${dayBgClass}`}>
                        <time dateTime={format(day, 'yyyy-MM-dd')} className={`text-xs ${dayTextClass}`}>
                            {format(day, 'd')}
                        </time>
                        <div className="mt-1 space-y-1">
                            {(campaignsByDate[format(day, 'yyyy-MM-dd')] || []).map(campaign => (
                                // ✅ CANVI: Colors adaptables per a l'esdeveniment
                                <div 
                                    key={campaign.id} 
                                    onClick={() => onCampaignSelect(campaign)} 
                                    className="text-xs bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground p-1 rounded truncate cursor-pointer hover:bg-primary/20 dark:hover:bg-primary/30"
                                >
                                    {campaign.name}
                                </div>
                            ))}
                        </div>
                    </div>
                );
            })}
          </div>
        </div>
      );
    };