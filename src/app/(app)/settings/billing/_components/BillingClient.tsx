"use client";

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

// Aquest component s'executa al navegador.
// Rep les dades del seu pare (el Server Component 'page.tsx').
export function BillingClient({ currentPlan }: { currentPlan: string }) {
  const { toast } = useToast();

  const handleManageSubscription = () => {
    toast({
      title: "🚧 Funcionalitat no implementada",
      description: "Aviat podràs gestionar la teva subscripció des d'aquí.",
    });
    // En el futur, aquí es cridaria una Server Action per redirigir a Stripe.
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8">
        <h2 className="text-xl font-semibold mb-4">La Teva Subscripció</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="font-semibold">Pla Actual</p>
              <p className="text-primary font-bold text-lg">{currentPlan}</p>
            </div>
            <Button variant="outline" onClick={handleManageSubscription}>
              Canviar de Pla
            </Button>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="font-semibold mb-2">Gestiona la teva facturació</p>
            <p className="text-muted-foreground mb-4">
              Actualitza les teves dades de pagament o cancel·la la teva subscripció a través del nostre portal segur de Stripe.
            </p>
            <Button onClick={handleManageSubscription}>
              Anar al Portal de Facturació
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
