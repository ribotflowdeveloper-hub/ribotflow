// /app/(app)/comunicacio/marketing/_components/marketing-client.tsx (FITXER COMPLET I CORREGIT)
"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Sparkles, List, Calendar, Target, BarChart2, CheckCircle, Lock } from 'lucide-react'; // ✅ 1. Importem 'Lock'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // ✅ 2. Importem 'Tooltip'
import Link from 'next/link'; // Importem Link

import { useMarketing } from '../_hooks/useMarketing';
import type { Campaign, Kpis } from './MarketingData';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ 3. Importem el tipus

import { MetricCard } from './MetricCard';
import { CampaignList } from './CampaignList';
import { CampaignCalendar } from './CampaignCalendar';
import { CampaignDetailDialog } from './CampaignDetailDialog';
import { AICampaignWizard } from './AICampaignWizard';

interface MarketingClientProps {
  initialKpis: Kpis, 
  initialCampaigns: Campaign[];
  campaignLimitStatus: UsageCheckResult; // ✅ 4. Rebem el límit de campanyes
  aiActionsLimitStatus: UsageCheckResult; // ✅ 5. Rebem el límit d'accions d'IA
}

export function MarketingClient({ 
  initialKpis, 
  initialCampaigns, 
  campaignLimitStatus, 
  aiActionsLimitStatus 
}: MarketingClientProps) {
    const t = useTranslations('Marketing');
    const t_billing = useTranslations('Billing'); // Per als missatges de límit
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

    // ✅ 6. Calculem si els límits s'han assolit
    const isCampaignLimitReached = !campaignLimitStatus.allowed;
    const isAILimitReached = !aiActionsLimitStatus.allowed;
    // El botó es bloqueja si s'ha assolit QUALSEVOL dels dos límits
    const isCreateDisabled = isCampaignLimitReached || isAILimitReached;

    // Determinem el missatge d'error correcte
    const limitError = isCampaignLimitReached ? campaignLimitStatus.error : aiActionsLimitStatus.error;
    
    return (
        <>
            <AICampaignWizard
                open={isWizardOpen}
                onOpenChange={setIsWizardOpen}
                onCampaignCreated={handleRefreshData}
                // ✅ 7. Passem els límits al Wizard
                campaignLimitStatus={campaignLimitStatus} 
                aiActionsLimitStatus={aiActionsLimitStatus}
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
                    
                    {/* ✅ 8. Botó "Crear Campanya" amb control de límits */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={isCreateDisabled ? 0 : -1}>
                            <Button onClick={handleOpenWizard} disabled={isCreateDisabled}>
                              {isCreateDisabled ? (
                                <Lock className="w-4 h-4 mr-2" />
                              ) : (
                                <Sparkles className="w-4 h-4 mr-2" />
                              )}
                              {t('createCampaignButton')}
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {isCreateDisabled && (
                          <TooltipContent className="max-w-xs p-3 shadow-lg rounded-lg border-2 border-yellow-400 bg-yellow-50">
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-yellow-900" />
                                <h3 className="font-semibold">{t_billing('limitReachedTitle')}</h3>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {limitError || t_billing('limitReachedDefault')}
                              </p>
                              <Button asChild size="sm" className="mt-1 w-full">
                                <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                              </Button>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                </div>

                <div className="flex flex-col md:flex-row gap-6">
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