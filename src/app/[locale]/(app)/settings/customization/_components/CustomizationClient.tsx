"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash, GripVertical } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
// ✅ 1. Importem el tipus 'Database' per accedir a l'esquema.
import { type Database } from '@/types/supabase';

// ✅ 2. Definim els tipus 'Stage' i 'Tag' basant-nos en les taules de la base de dades.
//    Aquests tipus ara coincideixen exactament amb el que passa 'CustomizationData'.
type Stage = Database['public']['Tables']['pipeline_stages']['Row'];
type Tag = Database['public']['Tables']['contact_tags']['Row'];

export function CustomizationClient({ initialStages, initialTags }: { 
  initialStages: Stage[], 
  initialTags: Tag[] 
}) {
  const t = useTranslations('CustomizationPage');
  
  const handleNotImplemented = () => {
    toast.info("Funcionalitat no implementada", {
      description: "Aviat podràs gestionar etapes i etiquetes des d'aquí."
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      {/* Targeta per al Tema i Idioma */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold">{t('themeTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">{t('themeDescription')}</p>
          <ThemeSwitcher />
        </div>
        
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold">{t('languageTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">{t('languageDescription')}</p>
          <LanguageSwitcher />
        </div>
      </div>

      {/* Etapes del Pipeline */}
      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{t('pipelineTitle')}</h2>
          <Button onClick={handleNotImplemented}><Plus className="w-4 h-4 mr-2" />{t('newStageButton')}</Button>
        </div>
        <div className="space-y-3">
          {initialStages.map(stage => (
            <div key={stage.id} className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
              <p className="flex-1 font-medium">{stage.name}</p>
              <Button variant="ghost" size="icon" onClick={handleNotImplemented}>
                <Trash className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Etiquetes de Contacte */}
      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">{t('tagsTitle')}</h2>
          <Button onClick={handleNotImplemented}><Plus className="w-4 h-4 mr-2" />{t('newTagButton')}</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          {initialTags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${tag.color}20`, color: tag.color || undefined }}>
              <span className="font-medium">{tag.name}</span>
              <button onClick={handleNotImplemented} className="opacity-50 hover:opacity-100">
                <Trash className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}