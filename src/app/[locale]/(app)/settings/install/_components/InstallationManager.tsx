'use client';

import { useState, useEffect, type FC, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils/utils';
import { DashboardCard } from '@/app/[locale]/(app)/dashboard/_components/DashboardCard'; // Assegura't que la ruta és correcta
import { AppleIcon, AndroidIcon, DesktopIcon } from './DeviceIcons';
import Image from 'next/image'; // ✅ Importem el component Image de Next.js


// =================================================================
// NOU: Subcomponent per a la previsualització del dispositiu
// =================================================================
const DevicePreview: FC<{ type: 'desktop' | 'mobile' }> = ({ type }) => (
  <div className="relative w-full max-w-[200px] aspect-[16/10] bg-gray-800/80 rounded-lg ring-2 ring-white/10 flex items-center justify-center mb-6">
    {/* Fons simulat */}
    <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-purple-900/50 opacity-40" />

    {/* Icona de l'app */}
    <Image
      src="/apple-touch-icon.png" // Icona de la teva app a la carpeta /public
      alt="Icona de l'aplicació"
      width={type === 'desktop' ? 48 : 56}
      height={type === 'desktop' ? 48 : 56}
      className="rounded-lg shadow-2xl"
    />

    {/* Marc del dispositiu */}
    {type === 'mobile' && <div className="absolute top-2 w-16 h-1.5 bg-white/50 rounded-full" />}
  </div>
);
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
    connect_device_title: string;
  };
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string; }>;
  prompt(): Promise<void>;
}

// =================================================================
// Subcomponent per a la targeta d'instruccions
// =================================================================
interface InstructionCardProps {
  icon: ReactNode;
  title: string;
  instructions: string;
  buttonText?: string;
  onButtonClick?: () => void;
  isRecommended: boolean;
  variant: "sales" | "agenda" | "iphone"; // Reutilitzem variants de color existents
  deviceType: 'desktop' | 'mobile'; // ✅ Nova prop per al tipus de dispositiu
}

const InstructionCard: FC<InstructionCardProps> = ({ icon, title, instructions, buttonText, onButtonClick, isRecommended, variant, deviceType }) => (<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.5 }}
  className={cn("h-full", isRecommended && "ring-2 ring-offset-2 ring-offset-background ring-primary")}
>
  <DashboardCard title={title} icon={() => icon} variant={variant} className="h-full">
    {isRecommended && (
      <div className="absolute top-2 right-2 flex items-center gap-1 text-xs font-semibold bg-primary-foreground text-primary px-2 py-1 rounded-full">
        <Star className="w-3 h-3" /> Recomanat
      </div>
    )}
    <div className="flex flex-col h-full text-center items-center">
      {/* ✅ AFEGIDA LA PREVISUALITZACIÓ */}
      <DevicePreview type={deviceType} />
      <div
        className="prose prose-sm dark:prose-invert text-left text-muted-foreground mt-4"
        dangerouslySetInnerHTML={{ __html: instructions.replace(/\n/g, '<br />') }}
      />
      {buttonText && onButtonClick && (
        <Button onClick={onButtonClick} className="mt-auto font-bold transition-transform hover:scale-105">
          <Download className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      )}
    </div>
  </DashboardCard>
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

  if (isStandalone) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-4 rounded-lg bg-green-500/10 dark:bg-green-800/20 p-8 text-green-700 dark:text-green-300 ring-2 ring-green-500/20 text-center"
      >
        <CheckCircle className="h-16 w-16" />
        <h3 className="text-2xl font-bold">{texts.already_installed}</h3>
        <p className="text-sm text-green-600 dark:text-green-400/80 max-w-md">Ja estàs utilitzant l'aplicació instal·lada. Gaudeix de la millor experiència de RibotFlow!</p>
      </motion.div>
    );
  }

  const commonIconProps = { size: 24, className: 'text-primary-foreground/80' };

  return (
    <div className="space-y-6">
      <h4 className="text-lg font-semibold">{texts.connect_device_title}</h4>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <InstructionCard
          icon={<DesktopIcon {...commonIconProps} />}
          title={texts.desktop_title}
          instructions={texts.desktop_instructions}
          buttonText={installPrompt && userOS === 'desktop' ? texts.install_button : undefined}
          onButtonClick={installPrompt && userOS === 'desktop' ? handleInstallClick : undefined}
          isRecommended={userOS === 'desktop'}
          variant="sales" // Blau
          deviceType="desktop" // ✅ Passem el tipus de dispositiu
        />
        <InstructionCard
          icon={<AndroidIcon {...commonIconProps} />}
          title={texts.android_title}
          instructions={texts.android_instructions}
          buttonText={installPrompt && userOS === 'android' ? texts.install_button : undefined}
          onButtonClick={installPrompt && userOS === 'android' ? handleInstallClick : undefined}
          isRecommended={userOS === 'android'}
          variant="agenda" // Verd
          deviceType="mobile" // ✅ Passem el tipus de dispositiu
        />
        <InstructionCard
          icon={<AppleIcon {...commonIconProps} />}
          title={texts.ios_title}
          instructions={texts.ios_instructions}
          isRecommended={userOS === 'ios'}
          variant="iphone" // Taronja
          deviceType="mobile" // ✅ Passem el tipus de dispositiu
        />
      </div>
    </div>
  );
}