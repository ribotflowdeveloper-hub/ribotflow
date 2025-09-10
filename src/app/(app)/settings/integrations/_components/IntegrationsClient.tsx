"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { connectGoogleAction, disconnectGoogleAction, connectMicrosoftAction, disconnectMicrosoftAction } from '../actions';
import Image from 'next/image';

interface IntegrationsClientProps {
  initialConnectionStatuses: {
    google: boolean;
    microsoft: boolean;
  };
}

export function IntegrationsClient({ initialConnectionStatuses }: IntegrationsClientProps) {
  const { toast } = useToast();
  const router = useRouter();
  
  const [connections, setConnections] = useState(initialConnectionStatuses);
  const [isPendingGoogle, startGoogleTransition] = useTransition();
  const [isPendingMicrosoft, startMicrosoftTransition] = useTransition();

  const handleConnect = (provider: 'google' | 'microsoft') => {
    if (provider === 'google') {
      startGoogleTransition(async () => { await connectGoogleAction(); });
    } else {
      startMicrosoftTransition(async () => { await connectMicrosoftAction(); });
    }
  };

  const handleDisconnect = (provider: 'google' | 'microsoft') => {
    if (provider === 'google') {
      startGoogleTransition(async () => {
        const result = await disconnectGoogleAction();
        if (result.success) {
          toast({ title: "Èxit!", description: result.message });
          setConnections(prev => ({...prev, google: false}));
          router.refresh();
        } else {
          toast({ variant: 'destructive', title: "Error", description: result.message });
        }
      });
    } else {
      startMicrosoftTransition(async () => {
        const result = await disconnectMicrosoftAction();
        if (result.success) {
          toast({ title: "Èxit!", description: result.message });
          setConnections(prev => ({...prev, microsoft: false}));
          router.refresh();
        } else {
          toast({ variant: 'destructive', title: "Error", description: result.message });
        }
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card p-8 space-y-4">
        <h2 className="text-xl font-semibold mb-2">Integracions de Correu</h2>
        
        {/* Google / Gmail */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
          <Image 
          src="https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" className="w-6 h-6" alt="Google logo"    width={24}
          height={24}/>
            <div>
              <h3 className="font-semibold">Google / Gmail</h3>
              <p className="text-sm text-muted-foreground">Sincronitza el teu correu de Gmail.</p>
            </div>
          </div>
          {isPendingGoogle ? <Loader2 className="w-5 h-5 animate-spin" /> : connections.google ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-green-500 font-semibold text-sm"><CheckCircle className="w-5 h-5" /> Connectat</span>
              <Button variant="destructive" size="sm" onClick={() => handleDisconnect('google')}><XCircle className="w-4 h-4 mr-2"/> Desconnectar</Button>
            </div>
          ) : (
            <Button onClick={() => handleConnect('google')}>Connectar</Button>
          )}
        </div>
        
        {/* Microsoft / Outlook */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-4">
          <Image  src="https://img.icons8.com/?size=100&id=117562&format=png&color=000000" className="w-6 h-6" alt="Microsoft logo"    width={24}
              height={24}/>
            <div>
              <h3 className="font-semibold">Microsoft / Outlook</h3>
              <p className="text-sm text-muted-foreground">Sincronitza el teu correu d'Outlook.</p>
            </div>
          </div>
          {isPendingMicrosoft ? <Loader2 className="w-5 h-5 animate-spin" /> : connections.microsoft ? (
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-2 text-green-500 font-semibold text-sm"><CheckCircle className="w-5 h-5" /> Connectat</span>
              <Button variant="destructive" size="sm" onClick={() => handleDisconnect('microsoft')}><XCircle className="w-4 h-4 mr-2"/> Desconnectar</Button>
            </div>
          ) : (
            <Button onClick={() => handleConnect('microsoft')}>Connectar</Button>
          )}
        </div>

      </div>
    </motion.div>
  );
}