/**
 * @file IntegrationsClient.tsx
 * @summary Gestiona la interfície d'usuari per a la pàgina d'Integracions.
 */
"use client";

import { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { 
  connectGoogleAction, disconnectGoogleAction, 
  connectMicrosoftAction, disconnectMicrosoftAction,
  connectLinkedInAction, disconnectLinkedInAction,
  connectFacebookAction, disconnectFacebookAction
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
    facebook: boolean;
    instagram: boolean;
  };
}

type Provider = 'google' | 'microsoft' | 'linkedin' | 'facebook';

// ✅ AQUESTA ÉS LA LÍNIA CLAU: Assegura't que el component s'exporta correctament.
export function IntegrationsClient({ initialConnectionStatuses }: IntegrationsClientProps) {
  const t = useTranslations('SettingsPage.integrations');
  const router = useRouter();
  const searchParams = useSearchParams();

  const [connections, setConnections] = useState(initialConnectionStatuses);
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
      if (provider === 'facebook') connectFacebookAction();
    });
  };

  const handleDisconnect = (provider: Provider) => {
    startTransition(async () => {
      const actionMap = {
        google: disconnectGoogleAction,
        microsoft: disconnectMicrosoftAction,
        linkedin: disconnectLinkedInAction,
        facebook: disconnectFacebookAction,
      };
      const result = await actionMap[provider]();
      if (result.success) {
        toast.success(t('success'), { description: result.message });
        if (provider === 'facebook') {
          setConnections(prev => ({ ...prev, facebook: false, instagram: false }));
        } else {
          setConnections(prev => ({ ...prev, [provider]: false }));
        }
        router.refresh();
      } else {
        toast.error(t('error'), { description: result.message });
      }
    });
  };
  
  const integrationList = [
    { name: 'google', title: t('googleTitle'), description: t('googleDescription'), icon: "https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" },
    { name: 'microsoft', title: t('microsoftTitle'), description: t('microsoftDescription'), icon: "https://img.icons8.com/?size=100&id=117562&format=png&color=000000" },
    { name: 'linkedin', title: t('linkedinTitle'), description: t('linkedinDescription'), icon: linkedin },
  ] as const;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-4 sm:p-6 md:p-8 space-y-4">
        <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>

        {integrationList.map((item) => (
          <div key={item.name} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <Image src={item.icon} width={width} height={height} alt={`${item.name} logo`} className="flex-shrink-0" />
              <div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
            <div className="w-full sm:w-auto flex-shrink-0">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : connections[item.name] ? (
                // ✅ MILLORA DE DISSENY: Afegim 'sm:gap-4' per a separar els elements a l'escriptori
                <div className="flex items-center justify-between w-full sm:gap-4">
                  <span className="flex items-center gap-2 text-green-500 text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
                  <Button variant="destructive" size="sm" onClick={() => handleDisconnect(item.name)}><XCircle className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{t('disconnectButton')}</span></Button>
                </div>
              ) : (
                <Button onClick={() => handleConnect(item.name)} className="w-full">{t('connectButton')}</Button>
              )}
            </div>
          </div>
        ))}
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2 flex-shrink-0">
                <Image src={facebook} width={width} height={height} alt="Facebook logo" className="rounded-full ring-2 ring-background"/>
                <Image src={instagram} width={width} height={height} alt="Instagram logo" className="rounded-full ring-2 ring-background"/>
              </div>
              <div>
                <h3 className="font-semibold">{t('metaTitle')}</h3>
                <p className="text-sm text-muted-foreground">{t('metaDescription')}</p>
              </div>
            </div>
            <div className="w-full sm:w-auto flex-shrink-0">
              {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : connections.facebook ? (
                // ✅ MILLORA DE DISSENY: Afegim 'sm:gap-4' també aquí
                <div className="flex items-center justify-between w-full sm:gap-4">
                  <span className="flex items-center gap-2 text-green-500 text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
                  <Button variant="destructive" size="sm" onClick={() => handleDisconnect('facebook')}><XCircle className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{t('disconnectButton')}</span></Button>
                </div>
              ) : (
                <Button onClick={() => handleConnect('facebook')} className="w-full">{t('connectButton')}</Button>
              )}
            </div>
        </div>
      </div>
    </motion.div>
  );
}

