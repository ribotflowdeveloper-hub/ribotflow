"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { connectGoogleAction, disconnectGoogleAction } from '../actions'; // Importem les Server Actions

export function IntegrationsClient({ isInitiallyConnected }: { isInitiallyConnected: boolean }) {
  const { toast } = useToast();
  const router = useRouter();
  const [isGoogleConnected, setIsGoogleConnected] = useState(isInitiallyConnected);
  
  // Hook `useTransition` per gestionar estats de càrrega amb Server Actions
  const [isPending, startTransition] = useTransition();

  const handleConnect = async () => {
    startTransition(async () => {
      // Les redireccions dins de les Server Actions s'han de gestionar així
      await connectGoogleAction(); 
    });
  };

  const handleDisconnect = () => {
    startTransition(async () => {
      const result = await disconnectGoogleAction();
      if (result.success) {
        toast({ title: "Èxit!", description: result.message });
        setIsGoogleConnected(false); // Actualitzem l'estat localment
        router.refresh(); // Refresquem les dades del servidor per si de cas
      } else {
        toast({ variant: 'destructive', title: "Error", description: result.message });
      }
    });
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8">
        <h2 className="text-xl font-semibold mb-6">Integracions</h2>
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <img src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" className="w-6 h-6" alt="Google logo"/>
            <div>
              <h3 className="font-semibold">Google / Gmail</h3>
              <p className="text-sm text-muted-foreground">Sincronitza el teu correu.</p>
            </div>
          </div>
          
          {isPending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isGoogleConnected ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-green-500 font-semibold text-sm">
                <CheckCircle className="w-5 h-5" /> Connectat
              </span>
              <Button variant="destructive" size="sm" onClick={handleDisconnect}>
                <XCircle className="w-4 h-4 mr-2"/> Desconnectar
              </Button>
            </div>
          ) : (
            <Button onClick={handleConnect}>Connectar Compte</Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}