/**
 * @file MarketingClient.tsx
 * @summary Aquest és el component orquestrador principal per a la pàgina de Màrqueting.
 * Com a component de client, gestiona tot l'estat de la interfície: la vista actual (llista o calendari),
 * l'obertura dels diàlegs (assistent d'IA i detall de campanya) i la campanya seleccionada.
 */

"use client"; // És el cor interactiu de la pàgina.

import React, { useState, FC } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, List, Calendar, Target, BarChart2, CheckCircle } from 'lucide-react';
import { type Campaign, type Kpis } from '../page';
import { CampaignList } from './CampaignList';
import { CampaignCalendar } from './CampaignCalendar';
import { CampaignDetailDialog } from './CampaignDetailDialog';
import { AICampaignWizard } from './AICampaignWizard';
import { useTranslations } from 'next-intl';

// Component petit i reutilitzable per mostrar les mètriques (KPIs).
const MetricCard: FC<{ title: string, value: string | number, icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="glass-effect p-6 rounded-xl flex-1">
    <div className="flex items-center gap-4">
      <div className="bg-purple-500/20 p-3 rounded-lg">{icon}</div>
      <div>
        <p className="text-gray-300 text-sm">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  </div>
);

export function MarketingClient({ initialKpis, initialCampaigns }: { initialKpis: Kpis, initialCampaigns: Campaign[] }) {
  const router = useRouter(); // Hook de Next.js per a la navegació i accions com refrescar la pàgina.
  const [view, setView] = useState('list'); // Estat per controlar si es mostra la llista o el calendari.
  const [isWizardOpen, setIsWizardOpen] = useState(false); // Estat per obrir/tancar l'assistent d'IA.
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null); // Estat per a la campanya seleccionada.
  const t = useTranslations('Marketing');

  /**
   * @summary Funció per refrescar les dades de la pàgina.
   * `router.refresh()` és una funció de Next.js que torna a executar la càrrega de dades del
   * component de servidor més proper, actualitzant la UI sense una recàrrega completa de la pàgina.
   */
  const refreshData = () => {
    router.refresh();
  };

  return (
    <>
      {/* Els diàlegs es renderitzen aquí a dalt, però només són visibles quan el seu estat 'open' és cert. */}
      <AICampaignWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onCampaignCreated={refreshData} />
      <CampaignDetailDialog open={!!selectedCampaign} onOpenChange={(isOpen) => !isOpen && setSelectedCampaign(null)} campaign={selectedCampaign} onCampaignUpdated={refreshData} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        {/* Capçalera de la pàgina */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> {t('createCampaignButton')}
          </Button>
        </div>
        {/* Secció de mètriques (KPIs) */}
        <div className="flex flex-col md:flex-row gap-6">
          <MetricCard title={t('kpiNewContacts')} value={initialKpis.totalLeads} icon={<Target className="text-purple-400" />} />
          <MetricCard title={t('kpiConversionRate')} value={`${initialKpis.conversionRate.toFixed(1)}%`} icon={<CheckCircle className="text-purple-400" />} />
          <MetricCard title={t('kpiInteraction')} value="N/A" icon={<BarChart2 className="text-purple-400" />} />
        </div>
        {/* Secció de la llista de campanyes amb canviador de vista */}
        <div className="flex justify-between items-center mt-8">
          <h2 className="text-2xl font-semibold">{t('yourCampaignsTitle')}</h2>
          <div className="flex gap-2">
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
            <Button variant={view === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('calendar')}><Calendar className="h-4 w-4" /></Button>
          </div>
        </div>
        {/* Renderització condicional: mostrem un missatge si no hi ha campanyes, o la vista seleccionada. */}
        {initialCampaigns.length === 0 ? (
          <p className="text-center text-gray-400 p-8">{t('noCampaignsMessage')}</p>
        ) : view === 'list' ? (
          <CampaignList campaigns={initialCampaigns} onCampaignSelect={setSelectedCampaign} />
        ) : (
          <CampaignCalendar campaigns={initialCampaigns} onCampaignSelect={setSelectedCampaign} />
        )}
      </motion.div>
    </>
  );
};