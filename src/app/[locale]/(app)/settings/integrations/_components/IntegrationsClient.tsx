/**
 * @file IntegrationsClient.tsx
 * @summary Gestiona la interfície d'usuari per a la pàgina d'Integracions.
 */
"use client";

import { useState, useTransition, useEffect, Key } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { 
  connectGoogleAction, disconnectGoogleAction, 
  connectMicrosoftAction, disconnectMicrosoftAction,
  connectLinkedInAction, disconnectLinkedInAction 
} from '../actions';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import instagram from '@/../public/instagram.jpeg';
import facebook from '@/../public/facebook.jpeg';
import linkedin from '@/../public/linkedin.png';

interface IntegrationsClientProps {
  initialConnectionStatuses: {
    google: boolean;
    microsoft: boolean;
    linkedin: boolean;
    Facebook: boolean;
    Instagram: boolean;
  };
}

// ✅ REFACTORITZACIÓ: Creem un tipus per als proveïdors per a més seguretat.
type Provider = 'google' | 'microsoft' | 'linkedin';

export function IntegrationsClient({ initialConnectionStatuses }: IntegrationsClientProps) {
  const t = useTranslations('SettingsPage.integrations');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [connections, setConnections] = useState(initialConnectionStatuses);
  
  // ✅ REFACTORITZACIÓ: Utilitzem un sol 'useTransition' per a totes les accions.
  const [isPending, startTransition] = useTransition();

  const width = 34;
  const height = 34;

  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');

    if (error) {
      toast.error(t('toast.error'), { description: t('toast.genericError') });
    }

    if (success === 'true') {
      toast.success(t('toast.success'), { description: t('toast.connectedSuccess') });
      router.refresh();
    }

    if (error || success) {
      router.replace('/settings/integrations', { scroll: false });
    }
  }, [searchParams, router, t]);

  const handleConnect = (provider: Provider) => {
    startTransition(() => {
      if (provider === 'google') connectGoogleAction();
      if (provider === 'microsoft') connectMicrosoftAction();
      if (provider === 'linkedin') connectLinkedInAction();
    });
  };

  const handleDisconnect = (provider: Provider) => {
    startTransition(async () => {
      const action = provider === 'google' ? disconnectGoogleAction : 
                     provider === 'microsoft' ? disconnectMicrosoftAction : 
                     disconnectLinkedInAction;
      
      const result = await action();
      if (result.success) {
        toast.success(t('success'), { description: result.message });
        setConnections(prev => ({ ...prev, [provider]: false }));
      } else {
        toast.error(t('error'), { description: result.message });
      }
    });
  };
  
  // ✅ REFACTORITZACIÓ: Definim les dades de les integracions en un array per a renderitzar-les en un bucle.
  // Això fa que el codi sigui molt més net i fàcil d'ampliar.
  const integrationList = [
    { name: 'google', title: t('googleTitle'), description: t('googleDescription'), icon: "https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" },
    { name: 'microsoft', title: t('microsoftTitle'), description: t('microsoftDescription'), icon: "https://img.icons8.com/?size=100&id=117562&format=png&color=000000" },
    { name: 'linkedin', title: t('linkedinTitle'), description: t('linkedinDescription'), icon: linkedin },
  ] as const; // 'as const' ajuda a TypeScript a entendre millor els tipus.

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8 space-y-4">
        <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>

        {integrationList.map((item) => (
          <div key={item.name} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Image src={item.icon} width={width} height={height} alt={`${item.name} logo`} />
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
            {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : connections[item.name] ? (
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-2 text-green-500"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
                <Button variant="destructive" size="sm" onClick={() => handleDisconnect(item.name)}><XCircle className="w-4 h-4 mr-2" /> {t('disconnectButton')}</Button>
              </div>
            ) : (
              <Button onClick={() => handleConnect(item.name)}>{t('connectButton')}</Button>
            )}
          </div>
        ))}
        
        {/* Integracions futures */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg opacity-50">
          <div className="flex items-center gap-4">
            <Image src={instagram} width={width} height={height} alt="Instagram logo" />
            <div>
              <h3 className="font-semibold">{t('instagramTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('instagramDescription')}</p>
            </div>
          </div>
          <Button disabled>{t('connectButton')}</Button>
        </div>
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg opacity-50">
          <div className="flex items-center gap-4">
            <Image src={facebook} width={width} height={height} alt="Facebook logo" />
            <div>
              <h3 className="font-semibold">{t('facebookTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('facebookDescription')}</p>
            </div>
          </div>
           <Button disabled>{t('connectButton')}</Button>
        </div>
        
      </div>
    </motion.div>
  );
}

