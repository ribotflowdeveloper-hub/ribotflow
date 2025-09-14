// src/app/(app)/settings/team/_components/TeamClient.tsx
"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
import { Plus, User } from 'lucide-react';

// Si li passes dades des del Server Component, les reps com a props
// export function TeamClient({ members }: { members: any[] }) {
export function TeamClient() {
 

  const handleInvite = () => {
    // ✅ 3. Actualitzem la crida a toast
    toast.info("Funció no implementada", {
        description: "La opció d'invitar membres aviat estarà disponible.",
    });
};

  return (
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
          {/* Aquí faries un map dels 'members' rebuts per props */}
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