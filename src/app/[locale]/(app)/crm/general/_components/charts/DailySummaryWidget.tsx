// src/app/[locale]/(app)/crm/general/_components/charts/DailySummaryWidget.tsx

"use client";

import { FC, ElementType } from 'react';
import { CheckCircle, Mail, FileText, Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { type DailySummaryData } from '../CrmData';
import { Separator } from '@/components/ui/separator';

interface DailySummaryWidgetProps {
    data: DailySummaryData;
}

const SummaryItem: FC<{ icon: ElementType, label: string, value: number, color: string }> = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <Icon className={`h-5 w-5 ${color}`} />
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
        </div>
        <p className="text-lg font-bold">{value}</p>
    </div>
);


export const DailySummaryWidget: FC<DailySummaryWidgetProps> = ({ data }) => {
    const t = useTranslations('CrmGeneralPage');

    return (
        <div className="p-2 space-y-4">
            <SummaryItem icon={CheckCircle} label={t('dailySummary.tasks')} value={data.tasks_completed} color="text-green-500" />
            <Separator />
            <SummaryItem icon={Mail} label={t('dailySummary.emails')} value={data.emails_sent} color="text-blue-500" />
            <Separator />
            <SummaryItem icon={FileText} label={t('dailySummary.quotes')} value={data.quotes_sent} color="text-purple-500" />
             <Separator />
            <SummaryItem icon={Calendar} label={t('dailySummary.meetings')} value={data.meetings_held} color="text-orange-500" />
        </div>
    );
};