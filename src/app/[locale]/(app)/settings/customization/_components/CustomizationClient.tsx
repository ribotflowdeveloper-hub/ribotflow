/**
 * @file CustomizationClient.tsx
 * @summary Component de client per a la pàgina de Personalització.
 */

"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash, GripVertical } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { type Stage, type Tag } from '../page';

// ✅ 1. Imports necessaris per a la lògica d'idioma
import { useTranslations, useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function CustomizationClient({ initialStages, initialTags }: { initialStages: Stage[], initialTags: Tag[] }) {
  const t = useTranslations('CustomizationPage');
  
  // ✅ 2. Hooks per gestionar la navegació i l'idioma
  const router = useRouter();
  const pathname = usePathname();
  const activeLocale = useLocale();
  const [isPending, startTransition] = useTransition();

  /**
   * @summary Canvia l'idioma de l'aplicació.
   * Reemplaça el codi de l'idioma a la URL actual i redirigeix.
   */
  const handleLanguageChange = (nextLocale: string) => {
    startTransition(() => {
      // Reconstruïm la URL manualment, que és el mètode més segur.
      const newPath = pathname.replace(`/${activeLocale}`, `/${nextLocale}`);
      router.replace(newPath);
    });
  };

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
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {t('themeDescription')}
          </p>
          <ThemeSwitcher />
        </div>
        
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold">{t('languageTitle')}</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {t('languageDescription')}
          </p>
          <div className="flex items-center gap-2">
            <Button variant={activeLocale === 'ca' ? 'default' : 'outline'} onClick={() => handleLanguageChange('ca')} disabled={isPending}>Català</Button>
            <Button variant={activeLocale === 'es' ? 'default' : 'outline'} onClick={() => handleLanguageChange('es')} disabled={isPending}>Español</Button>
            <Button variant={activeLocale === 'en' ? 'default' : 'outline'} onClick={() => handleLanguageChange('en')} disabled={isPending}>English</Button>
          </div>
        </div>
      </div>

   {/* Etapes del Pipeline */}
   <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          {/* ✅ Text traduït */}
          <h2 className="text-xl font-semibold">{t('pipelineTitle')}</h2>
          {/* ✅ Text traduït */}
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
          {/* ✅ Text traduït */}
          <h2 className="text-xl font-semibold">{t('tagsTitle')}</h2>
          {/* ✅ Text traduït */}
          <Button onClick={handleNotImplemented}><Plus className="w-4 h-4 mr-2" />{t('newTagButton')}</Button>
        </div>
        <div className="flex flex-wrap gap-3">
          {initialTags.map(tag => (
            <div key={tag.id} className="flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: `${tag.color}20`, color: tag.color }}>
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