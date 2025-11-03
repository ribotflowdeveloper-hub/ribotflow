// Ubicació: /app/(app)/comunicacio/marketing/_components/MarketingClient.tsx
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Sparkles, List, Calendar, Target, BarChart2, CheckCircle } from 'lucide-react';

import { useMarketing } from '../_hooks/useMarketing';
import type { Campaign, Kpis } from './MarketingData';

import { MetricCard } from './MetricCard';
import { CampaignList } from './CampaignList';
import { CampaignCalendar } from './CampaignCalendar';
import { CampaignDetailDialog } from './CampaignDetailDialog';
import { AICampaignWizard } from './AICampaignWizard';


export function MarketingClient({ initialKpis, initialCampaigns }: { initialKpis: Kpis, initialCampaigns: Campaign[] }) {
    const t = useTranslations('Marketing');
    const {
        view,
        isWizardOpen,
        selectedCampaign,
        setView,
        setIsWizardOpen,
        handleRefreshData,
        handleOpenWizard,
        handleSelectCampaign,
    } = useMarketing();

    return (
        <>
            <AICampaignWizard
                open={isWizardOpen}
                onOpenChange={setIsWizardOpen}
                onCampaignCreated={handleRefreshData}
            />
            <CampaignDetailDialog
                open={!!selectedCampaign}
                onOpenChange={(isOpen) => !isOpen && handleSelectCampaign(null)}
                campaign={selectedCampaign}
                onCampaignUpdated={handleRefreshData}
            />

            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <Button onClick={handleOpenWizard}>
                        <Sparkles className="w-4 h-4 mr-2" /> {t('createCampaignButton')}
                    </Button>
                </div>

                <div className="flex flex-col md:flex-row gap-6">
                    {/* ✅ CANVI: Passem el component icona (Target) directament,
                        en lloc d'un element React (<Target className="..." />).
                        La 'MetricCard' ara s'encarrega d'afegir el color.
                    */}
                    <MetricCard title={t('kpiNewContacts')} value={initialKpis.totalLeads} icon={Target} />
                    <MetricCard title={t('kpiConversionRate')} value={`${initialKpis.conversionRate.toFixed(1)}%`} icon={CheckCircle} />
                    <MetricCard title={t('kpiInteraction')} value="N/A" icon={BarChart2} />
                </div>

                <div className="flex justify-between items-center mt-8">
                    <h2 className="text-2xl font-semibold">{t('yourCampaignsTitle')}</h2>
                    <div className="flex gap-2">
                        <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
                        <Button variant={view === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('calendar')}><Calendar className="h-4 w-4" /></Button>
                    </div>
                </div>

                {/* ✅ CANVI: Text semàntic per al missatge de "no campanyes" */}
                {initialCampaigns.length === 0 ? (
                    <p className="text-center text-muted-foreground p-8">{t('noCampaignsMessage')}</p>
                ) : view === 'list' ? (
                    <CampaignList campaigns={initialCampaigns} onCampaignSelect={handleSelectCampaign} />
                ) : (
                    <CampaignCalendar campaigns={initialCampaigns} onCampaignSelect={handleSelectCampaign} />
                )}
            </motion.div>
        </>
    );
}