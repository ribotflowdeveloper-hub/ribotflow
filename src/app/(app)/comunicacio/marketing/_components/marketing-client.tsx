"use client";

import React, { useState, FC} from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Sparkles, List, Calendar, Target, BarChart2, CheckCircle } from 'lucide-react';
import { type Campaign, type Kpis } from '../page';
import { CampaignList } from './CampaignList';
import { CampaignCalendar } from './CampaignCalendar';
import { CampaignDetailDialog } from './CampaignDetailDialog';
import { AICampaignWizard } from './AICampaignWizard';

const MetricCard: FC<{title: string, value: string | number, icon: React.ReactNode}> = ({ title, value, icon }) => (
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
  const router = useRouter();
  const [view, setView] = useState('list');
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const refreshData = () => {
    router.refresh();
  };

  return (
    <>
      <AICampaignWizard open={isWizardOpen} onOpenChange={setIsWizardOpen} onCampaignCreated={refreshData} />
      <CampaignDetailDialog open={!!selectedCampaign} onOpenChange={(isOpen) => !isOpen && setSelectedCampaign(null)} campaign={selectedCampaign} onCampaignUpdated={refreshData} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Centre de Màrqueting</h1>
          <Button onClick={() => setIsWizardOpen(true)}>
            <Sparkles className="w-4 h-4 mr-2" /> Crear Campanya amb IA
          </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          <MetricCard title="Nous Contactes (Mes)" value={initialKpis.totalLeads} icon={<Target className="text-purple-400" />} />
          <MetricCard title="Taxa de Conversió" value={`${initialKpis.conversionRate.toFixed(1)}%`} icon={<CheckCircle className="text-purple-400" />} />
          <MetricCard title="Interacció (Properament)" value="N/A" icon={<BarChart2 className="text-purple-400" />} />
        </div>

        <div className="flex justify-between items-center mt-8">
          <h2 className="text-2xl font-semibold">Les Teves Campanyes</h2>
          <div className="flex gap-2">
            <Button variant={view === 'list' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('list')}><List className="h-4 w-4" /></Button>
            <Button variant={view === 'calendar' ? 'secondary' : 'ghost'} size="icon" onClick={() => setView('calendar')}><Calendar className="h-4 w-4" /></Button>
          </div>
        </div>
        
        {initialCampaigns.length === 0 ? (
          <p className="text-center text-gray-400 p-8">Encara no has creat cap campanya. Fes clic a "Crear Campanya amb IA" per començar.</p>
        ) : view === 'list' ? (
          <CampaignList campaigns={initialCampaigns} onCampaignSelect={setSelectedCampaign} />
        ) : (
          <CampaignCalendar campaigns={initialCampaigns} onCampaignSelect={setSelectedCampaign} />
        )}
      </motion.div>
    </>
  );
};