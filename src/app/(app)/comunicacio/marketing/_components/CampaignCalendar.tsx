"use client";

import React, { useState, useMemo, FC } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ca } from 'date-fns/locale';
import { type Campaign } from '../page';

interface CampaignCalendarProps {
  campaigns: Campaign[];
  onCampaignSelect: (campaign: Campaign) => void;
}

export const CampaignCalendar: FC<CampaignCalendarProps> = ({ campaigns, onCampaignSelect }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
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

    return (
        <div className="glass-effect rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}><ChevronLeft /></Button>
                <h3 className="text-lg font-semibold capitalize">{format(currentMonth, "MMMM yyyy", { locale: ca })}</h3>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}><ChevronRight /></Button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {['Dl', 'Dt', 'Dc', 'Dj', 'Dv', 'Ds', 'Dg'].map(day => <div key={day} className="font-bold">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
                {days.map(day => (
                    <div key={day.toString()} className={`h-24 rounded-lg p-1 overflow-hidden ${isSameMonth(day, monthStart) ? 'bg-background/20' : 'bg-background/5'}`}>
                        <time dateTime={format(day, 'yyyy-MM-dd')} className={`text-xs ${isSameDay(day, new Date()) ? 'font-bold text-primary' : ''}`}>{format(day, 'd')}</time>
                        <div className="mt-1 space-y-1">
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