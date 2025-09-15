/**
 * @file CampaignCalendar.tsx
 * @summary Component de client que renderitza un calendari visual per a les campanyes de màrqueting.
 * Permet a l'usuari veure les campanyes organitzades per mes i seleccionar-ne una per veure'n els detalls.
 */

"use client"; // És un component de client perquè gestiona l'estat del mes actual i la interacció de l'usuari.

import React, { useState, useMemo, FC } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
// Importem funcions de la llibreria 'date-fns' per a la manipulació de dates. És molt potent i lleugera.
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ca } from 'date-fns/locale'; // Importem la localització en català per als noms dels mesos.
import { type Campaign } from '../page'; // Tipus de dades per a una campanya.

// Interfície de propietats del component.
interface CampaignCalendarProps {
  campaigns: Campaign[]; // Llista de campanyes a mostrar.
  onCampaignSelect: (campaign: Campaign) => void; // Funció per notificar quan es fa clic a una campanya.
}

export const CampaignCalendar: FC<CampaignCalendarProps> = ({ campaigns, onCampaignSelect }) => {
  // Estat per controlar quin mes s'està visualitzant actualment.
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // --- Càlculs de dates per construir la graella del calendari ---
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  // Per tenir una graella completa, calculem des de l'inici de la primera setmana fins al final de l'última.
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Comencem la setmana en dilluns.
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  // Generem un array amb tots els dies que s'han de mostrar a la graella.
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  /**
   * @constant campaignsByDate
   * @summary Memoitzem el càlcul per agrupar les campanyes per data.
   * `useMemo` evita que aquest càlcul es torni a fer en cada renderització si les campanyes no han canviat.
   * El resultat és un objecte on cada clau és una data (ex: '2025-09-15') i el valor és un array de campanyes.
   */
  const campaignsByDate = useMemo(() => {
        return campaigns.reduce((acc, campaign) => {
            const date = format(new Date(campaign.campaign_date), 'yyyy-MM-dd');
            if (!acc[date]) acc[date] = [];
            acc[date].push(campaign);
            return acc;
        }, {} as Record<string, Campaign[]>);
  }, [campaigns]);

  return (
        <div className="glass-effect rounded-xl p-4">
          {/* Capçalera del calendari amb la navegació de mesos. */}
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft /></Button>
                <h3 className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ca })}</h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight /></Button>
            </div>
          {/* Dies de la setmana. */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map(day => <div key={day} className="font-bold">{day}</div>)}
            </div>
          {/* Graella principal amb els dies del mes. */}
            <div className="grid grid-cols-7 gap-1 mt-2">
                {days.map(day => (
                    <div key={day.toString()} className={`h-24 rounded-lg p-1 overflow-hidden ${isSameMonth(day, monthStart) ? 'bg-background/20' : 'bg-background/5'}`}>
                        <time dateTime={format(day, 'yyyy-MM-dd')} className={`text-xs ${isSameDay(day, new Date()) ? 'font-bold text-primary' : ''}`}>{format(day, 'd')}</time>
                        <div className="mt-1 space-y-1">
                          {/* Busquem al nostre objecte memoitzat si hi ha campanyes per a aquest dia. */}
                            {(campaignsByDate[format(day, 'yyyy-MM-dd')] || []).map(campaign => (
                                <div key={campaign.id} onClick={() => onCampaignSelect(campaign)} className="text-xs bg-primary/20 text-primary-foreground p-1 rounded truncate cursor-pointer hover:bg-primary/40">{campaign.name}</div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
