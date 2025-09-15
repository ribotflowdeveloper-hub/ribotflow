"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Plus, User } from 'lucide-react';

/**
 * Component de Client per a la pàgina de "Gestió de l'Equip".
 * S'encarrega de la part interactiva de la interfície.
 * Actualment, la funcionalitat està per implementar, així que mostra una maqueta.
 */
// En un futur, quan carreguis les dades des del servidor, les rebries com a 'props'.
// Per exemple: export function TeamClient({ members }: { members: Member[] }) {
export function TeamClient() {

  /**
   * Funció que s'executa en clicar el botó "Invitar Membre".
   * Com que la funcionalitat encara no està desenvolupada, mostra una notificació
   * informativa a l'usuari.
   */
  const handleInvite = () => {
    toast.info("Funció no implementada", {
        description: "L'opció d'invitar membres aviat estarà disponible.",
    });
  };

  return (
    // 'motion.div' de Framer Motion per a una animació d'aparició suau.
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Membres de l'Equip</h2>
          <Button onClick={handleInvite}>
            <Plus className="w-4 h-4 mr-2" />
            Invitar Membre
          </Button>
        </div>
        <div className="space-y-3">
          {/* Aquesta secció és una maqueta. En el futur, aquí es faria un '.map()'
              sobre l'array de 'members' rebut per props per renderitzar cada membre
              de l'equip de forma dinàmica. */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-semibold">Tu (Propietari)</p>
                <p className="text-sm text-muted-foreground">email@exemple.com</p>
              </div>
            </div>
            <span className="text-sm text-muted-foreground">Administrador</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}