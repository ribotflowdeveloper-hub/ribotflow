"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash, GripVertical, Settings, Palette, Languages, Network } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ThemeSwitcher } from '@/app/[locale]/(app)/settings/customization/_components/ThemeSwitcher';
import { LanguageSwitcher } from '@/app/[locale]/(app)/settings/customization/_components/LanguageSwitcher';
import { ModuleCard } from '@/components/shared/ModuleCard'; // Assegura't que la ruta sigui correcta
import { type Database } from '@/types/supabase';


type Stage = Database['public']['Tables']['pipeline_stages']['Row'];
type Tag = Database['public']['Tables']['contact_tags']['Row'];

// --- Sub-component per gestionar les etapes del Pipeline ---
function PipelineStagesManager({ initialStages }: { initialStages: Stage[] }) {
  const t = useTranslations('CustomizationPage');
  const [stages] = useState(initialStages);
  
  const handleNotImplemented = () => toast.info("Funcionalitat no implementada.");

  return (
    <ModuleCard title={t('pipelineTitle')} icon={Network} variant="default">
      <div className="space-y-3">
        {stages.map(stage => (
          <div key={stage.id} className="flex items-center gap-3 p-2 bg-muted dark:bg-muted/50 rounded-lg border">
            <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
            <p className="flex-1 font-medium">{stage.name}</p>
            <Button variant="ghost" size="icon" onClick={handleNotImplemented}>
              <Trash className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
        <Button onClick={handleNotImplemented} variant="outline" className="w-full mt-4">
          <Plus className="w-4 h-4 mr-2" />{t('newStageButton')}
        </Button>
      </div>
    </ModuleCard>
  );
}

// --- Sub-component per gestionar les etiquetes ---
function ContactTagsManager({ initialTags }: { initialTags: Tag[] }) {
  const t = useTranslations('CustomizationPage');
  const [tags] = useState(initialTags);
  
  const handleNotImplemented = () => toast.info("Funcionalitat no implementada.");

  return (
    <ModuleCard title={t('tagsTitle')} icon={Palette} variant="default">
      <div className="flex flex-wrap gap-3">
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-2 pl-3 pr-2 py-1 rounded-full text-sm border font-medium" style={{ backgroundColor: `${tag.color}20`, borderColor: `${tag.color}40`, color: tag.color || undefined }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || undefined }} />
            <span>{tag.name}</span>
            <button onClick={handleNotImplemented} className="opacity-50 hover:opacity-100 transition-opacity">
              <Trash className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
      <Button onClick={handleNotImplemented} variant="outline" className="w-full mt-6">
          <Plus className="w-4 h-4 mr-2" />{t('newTagButton')}
      </Button>
    </ModuleCard>
  );
}

// --- Component principal ---
export function CustomizationClient({ initialStages, initialTags }: { 
  initialStages: Stage[], 
  initialTags: Tag[] 
}) {
  const t = useTranslations('CustomizationPage');

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start"
    >
      {/* Columna principal */}
      <div className="lg:col-span-2 space-y-8">
        <PipelineStagesManager initialStages={initialStages} />
        <ContactTagsManager initialTags={initialTags} />
      </div>

      {/* Columna lateral */}
      <div className="lg:col-span-1 space-y-8">
        <ModuleCard title={t('themeTitle')} icon={Settings} variant="default" >
            <p className="text-sm text-muted-foreground mb-4">{t('themeDescription')}</p>
            <ThemeSwitcher />
        </ModuleCard>

        <ModuleCard title={t('languageTitle')} icon={Languages} variant="default">
            <p className="text-sm text-muted-foreground mb-4">{t('languageDescription')}</p>
            <LanguageSwitcher />
        </ModuleCard>
      </div>
    </motion.div>
  );
}