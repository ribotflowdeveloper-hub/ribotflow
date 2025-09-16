/**
 * @file IntegrationsClient.tsx
 * @summary Aquest fitxer conté el component de client que gestiona la interfície d'usuari
 * per a la pàgina d'Integracions. Mostra l'estat de les connexions (Google, Microsoft)
 * i gestiona les accions de l'usuari per connectar o desconnectar serveis.
 */

"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { connectGoogleAction, disconnectGoogleAction, connectMicrosoftAction, disconnectMicrosoftAction } from '../actions';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface IntegrationsClientProps {
  initialConnectionStatuses: {
    google: boolean;
    microsoft: boolean;
  };
}

export function IntegrationsClient({ initialConnectionStatuses }: IntegrationsClientProps) {
  const t = useTranslations('SettingsPage.integrations');
  const router = useRouter();

  // Estat per a l'estat actual de les connexions. S'inicialitza amb les dades del servidor.
  const [connections, setConnections] = useState(initialConnectionStatuses);
  // Hooks 'useTransition' per gestionar l'estat de càrrega de cada proveïdor per separat.
  const [isPendingGoogle, startGoogleTransition] = useTransition();
  const [isPendingMicrosoft, startMicrosoftTransition] = useTransition();

  /**
   * @summary Gestor per iniciar el flux de connexió (vinculació) amb un proveïdor.
   */
  const handleConnect = (provider: 'google' | 'microsoft') => {
    if (provider === 'google') {
      // 'startTransition' embolcalla l'acció asíncrona. Mentre s'executa, 'isPendingGoogle' serà 'true'.
      startGoogleTransition(async () => { await connectGoogleAction(); });
    } else {
      startMicrosoftTransition(async () => { await connectMicrosoftAction(); });
    }
  };

  /**
   * @summary Gestor per desconnectar un proveïdor.
   */
  const handleDisconnect = (provider: 'google' | 'microsoft') => {
    if (provider === 'google') {
      startGoogleTransition(async () => {
        const result = await disconnectGoogleAction();
        if (result.success) {
          toast.success(t('success'), { description: result.message });
          // Actualitzem l'estat de la UI immediatament.
          setConnections(prev => ({ ...prev, google: false }));
          router.refresh(); // Refresquem les dades del servidor.
        } else {
          toast.error(t('error'), { description: result.message });
        }
      });
    } else {
      startMicrosoftTransition(async () => {
        const result = await disconnectMicrosoftAction();
        if (result.success) {
          toast.success("Èxit!", { description: result.message });
          setConnections(prev => ({ ...prev, microsoft: false }));
          router.refresh();
        } else {
          toast.error("Error", { description: result.message });
        }
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8 space-y-4">
        <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>

        {/* Google / Gmail */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Image
              src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" className="w-6 h-6" alt="Google logo" width={24}
              height={24} />
            <div>
              <h3 className="font-semibold">{t('googleTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('googleDescription')}</p>
            </div>
          </div>
          {/* ... (Contingut de la targeta de Google) ... */}
          {/* Renderització condicional basada en l'estat de càrrega i de connexió. */}
          {isPendingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : connections.google ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-green-500 font-semibold text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
              <Button variant="destructive" size="sm" onClick={() => handleDisconnect('google')}><XCircle className="w-4 h-4 mr-2" /> {t('disconnectButton')}</Button>
            </div>
          ) : (
            <Button onClick={() => handleConnect('google')}>{t('connectButton')}</Button>
          )}
        </div>

        {/* Microsoft / Outlook */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
            <Image src="https://img.icons8.com/?size=100&id=117562&format=png&color=000000" className="w-6 h-6" alt="Microsoft logo" width={24}
              height={24} />
            <div>
            <h3 className="font-semibold">{t('microsoftTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('microsoftDescription')}</p>
            </div>
          </div>

          {isPendingMicrosoft ? <Loader2 className="w-5 h-5 animate-spin" /> : connections.microsoft ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-green-500 font-semibold text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
              <Button variant="destructive" size="sm" onClick={() => handleDisconnect('microsoft')}><XCircle className="w-4 h-4 mr-2" /> {t('disconnectButton')}</Button>
            </div>
          ) : (
            <Button onClick={() => handleConnect('microsoft')}>{t('connectButton')}</Button>
          )}
        </div>

      </div>
    </motion.div>
  );
}