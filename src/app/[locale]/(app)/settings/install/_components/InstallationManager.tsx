// src/app/[locale]/(app)/settings/install/_components/InstallationManager.tsx
'use client';

import { useState, useEffect, type FC, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/utils';

// NOU: Importem les nostres icones personalitzades
import { AppleIcon, AndroidIcon, DesktopIcon } from './DeviceIcons';

interface InstallationManagerProps {
  texts: {
    install_button: string;
    desktop_title: string;
    desktop_instructions: string;
    android_title: string;
    android_instructions: string;
    ios_title: string;
    ios_instructions: string;
    already_installed: string;
    connect_device_title: string; // Text nou per al títol
  };
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// =================================================================
// NOU: Subcomponent per a la targeta de dispositiu estilitzada
// =================================================================
interface DeviceInstallationCardProps {
  icon: ReactNode;
  title: string;
  instructions: string;
  buttonText?: string;
  onButtonClick?: () => void;
  gradient: string;
}

const DeviceInstallationCard: FC<DeviceInstallationCardProps> = ({
  icon,
  title,
  instructions,
  buttonText,
  onButtonClick,
  gradient,
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    className={cn(
      'rounded-xl p-6 md:p-8 flex flex-col items-center text-center text-white/90 ring-1 ring-white/10 shadow-2xl shadow-slate-900/50 relative overflow-hidden',
      gradient
    )}
  >
    <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/5 rounded-full opacity-50" />
    <div className="mb-4">{icon}</div>
    <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
    <p className="text-sm text-white/60 max-w-sm mb-6">{instructions}</p>
    {buttonText && onButtonClick && (
      <Button
        onClick={onButtonClick}
        className="bg-white text-black hover:bg-white/90 font-bold transition-transform hover:scale-105"
      >
        <Download className="mr-2 h-4 w-4" />
        {buttonText}
      </Button>
    )}
  </motion.div>
);


// =================================================================
// COMPONENT PRINCIPAL REDISSENYAT
// =================================================================
export function InstallationManager({ texts }: InstallationManagerProps) {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [userOS, setUserOS] = useState<'android' | 'ios' | 'desktop' | null>(null);

  useEffect(() => {
    // La lògica de detecció es manté igual, és robusta.
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true);
    }
    
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (/android/.test(userAgent)) setUserOS('android');
    else if (/iphone|ipad|ipod/.test(userAgent)) setUserOS('ios');
    else setUserOS('desktop');
    
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('Usuari ha acceptat instal·lar la PWA.');
      setInstallPrompt(null);
    }
  };

  // NOU: Disseny millorat per a l'estat "Ja instal·lat"
  if (isStandalone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex items-center space-x-3 rounded-lg bg-green-500/10 p-4 text-green-400 ring-1 ring-green-500/20"
      >
        <CheckCircle className="h-6 w-6" />
        <p className="font-medium">{texts.already_installed}</p>
      </motion.div>
    );
  }
  
  // LÒGICA CLAU: Funció per renderitzar la targeta correcta
  const renderDeviceCard = () => {
    const commonIconProps = { size: 48, className: 'text-white/80' };

    switch (userOS) {
      case 'android':
        return (
          <DeviceInstallationCard
            icon={<AndroidIcon {...commonIconProps} />}
            title={texts.android_title}
            instructions={texts.android_instructions}
            buttonText={installPrompt ? texts.install_button : undefined}
            onButtonClick={installPrompt ? handleInstallClick : undefined}
            gradient="bg-gradient-to-br from-[#3DDC84] to-[#20A658]"
          />
        );
      case 'ios':
        return (
          <DeviceInstallationCard
            icon={<AppleIcon {...commonIconProps} />}
            title={texts.ios_title}
            instructions={texts.ios_instructions}
            // A iOS no hi ha 'installPrompt', per tant, no mostrem botó.
            gradient="bg-gradient-to-br from-[#555] to-[#111]"
          />
        );
      case 'desktop':
        return (
          <DeviceInstallationCard
            icon={<DesktopIcon {...commonIconProps} />}
            title={texts.desktop_title}
            instructions={texts.desktop_instructions}
            buttonText={installPrompt ? texts.install_button : undefined}
            onButtonClick={installPrompt ? handleInstallClick : undefined}
            gradient="bg-gradient-to-br from-[#007CF0] to-[#0052D4]"
          />
        );
      default:
        // Mostra un estat de càrrega o res mentre es detecta el SO.
        return <div className="h-64 w-full rounded-xl bg-muted/50 animate-pulse" />;
    }
  };

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">{texts.connect_device_title}</h4>
      <div className="flex justify-center">
        {renderDeviceCard()}
      </div>
    </div>
  );
}