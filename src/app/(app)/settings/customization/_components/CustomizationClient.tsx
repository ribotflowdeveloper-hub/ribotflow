/**
 * @file CustomizationClient.tsx
 * @summary Aquest fitxer conté el component de client que gestiona tota la interfície interactiva
 * de la pàgina de Personalització. S'encarrega de mostrar les opcions per canviar el tema,
 * l'idioma, i gestionar les etapes del pipeline i les etiquetes.
 */

"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, Trash, GripVertical } from 'lucide-react';
import { ThemeSwitcher } from './ThemeSwitcher';
import { type Stage, type Tag } from '../page'; // Importem els tipus definits a la pàgina del servidor.

export function CustomizationClient({ initialStages, initialTags }: { initialStages: Stage[], initialTags: Tag[] }) {
  
  /**
   * @summary Gestor d'esdeveniments temporal per a funcionalitats encara no implementades.
   * Mostra una notificació a l'usuari.
   */
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
          <h2 className="text-xl font-semibold">Tema de l'Aplicació</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Tria com vols veure la interfície.</p>
          {/* Component separat per a la lògica del canvi de tema. */}
          <ThemeSwitcher />
        </div>
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold">Idioma</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-6">Selecciona el teu idioma de preferència.</p>
          <Button variant="outline" onClick={handleNotImplemented}>Canviar Idioma</Button>
        </div>
      </div>

      {/* Secció per a les Etapes del Pipeline */}
      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Personalitzar Etapes del Pipeline</h2>
          <Button onClick={handleNotImplemented}><Plus className="w-4 h-4 mr-2" /> Nova Etapa</Button>
        </div>
        {/* Llista les etapes rebudes des del component de servidor. */}
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

      {/* Secció per a les Etiquetes de Contacte */}
      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Gestionar Etiquetes de Contacte</h2>
          <Button onClick={handleNotImplemented}><Plus className="w-4 h-4 mr-2" /> Nova Etiqueta</Button>
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
