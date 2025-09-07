import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash, GripVertical, Tag } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher'; // <-- Importem el nostre component
import { LanguageSwitcher } from '../LanguageSwitcher'; // <-- Importem el selector d'idioma
import { useTranslation } from 'react-i18next'; // <-- Importem el hook de traducció

const CustomizationSettings = () => {
  const { t } = useTranslation(); // <-- Inicialitzem el hook
  const { user } = useAuth();
  const { toast } = useToast();
  const [stages, setStages] = useState([]);
  const [tags, setTags] = useState([]);
  const [loadingStages, setLoadingStages] = useState(true);
  const [loadingTags, setLoadingTags] = useState(true);

  useEffect(() => {
    const fetchStages = async () => {
      if (!user) return;
      setLoadingStages(true);
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*')
        .eq('user_id', user.id)
        .order('position', { ascending: true });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar les etapes.' });
      } else {
        setStages(data);
      }
      setLoadingStages(false);
    };

    const fetchTags = async () => {
      if (!user) return;
      setLoadingTags(true);
      const { data, error } = await supabase
        .from('contact_tags')
        .select('*')
        .eq('user_id', user.id)
        .order('name', { ascending: true });

      if (error) {
        toast({ variant: 'destructive', title: 'Error', description: 'No s\'han pogut carregar les etiquetes.' });
      } else {
        setTags(data);
      }
      setLoadingTags(false);
    };

    fetchStages();
    fetchTags();
  }, [user, toast]);

  const handleNotImplemented = () => {
    toast({
      title: "🚧 Funcionalitat no implementada",
      description: "Pots demanar-ho en el proper missatge."
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      
      {/* Targeta per a les opcions de visualització (Tema i Idioma) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xl font-semibold">{t('settings.customization.theme_title')}</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {t('settings.customization.theme_desc')}
          </p>
          <ThemeSwitcher />
        </div>
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-xl font-semibold">{t('settings.customization.language_title')}</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">
            {t('settings.customization.language_desc')}
          </p>
          <LanguageSwitcher />
        </div>
      </div>

      {/* La teva secció per a les Etapes del Pipeline es manté igual */}
      <div className="glass-effect rounded-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Personalitzar Etapes del Pipeline</h2>
          <Button onClick={handleNotImplemented}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Etapa
          </Button>
        </div>
        {loadingStages ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {stages.map(stage => (
              <div key={stage.id} className="flex items-center gap-3 p-3 bg-card/50 rounded-lg">
                <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                <input
                  type="text"
                  value={stage.name}
                  readOnly
                  className="flex-1 bg-transparent focus:outline-none"
                />
                <Button variant="ghost" size="icon" onClick={handleNotImplemented}>
                  <Trash className="w-4 h-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* La teva secció per a les Etiquetes de Contacte es manté igual */}
      <div className="glass-effect rounded-xl p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Gestionar Etiquetes de Contacte</h2>
          <Button onClick={handleNotImplemented}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Etiqueta
          </Button>
        </div>
        {loadingTags ? (
          <div className="flex justify-center items-center h-20">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="flex flex-wrap gap-3">
            {tags.map(tag => (
              <div key={tag.id} className="flex items-center gap-2 px-3 py-1 rounded-full text-sm" style={{ backgroundColor: tag.color + '20', color: tag.color }}>
                <span className="font-medium">{tag.name}</span>
                <button onClick={handleNotImplemented} className="opacity-50 hover:opacity-100"><Trash className="w-3 h-3" /></button>
              </div>
            ))}
          </div>
        )}
      </div>
      
    </motion.div>
  );
};

export default CustomizationSettings;