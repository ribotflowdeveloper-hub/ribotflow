"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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

// Importem les teves imatges locals
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

// Definim el tipus per als proveïdors per a més seguretat
type Provider = 'google' | 'microsoft' | 'linkedin' | 'facebook';

export function IntegrationsClient({ initialConnectionStatuses }: IntegrationsClientProps) {
    const t = useTranslations('SettingsPage.integrations');
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Utilitzem un estat local per a poder actualitzar la UI a l'instant
    const [connections, setConnections] = useState(initialConnectionStatuses);
    // Un únic estat de càrrega per a totes les accions
    const [isPending, startTransition] = useTransition();

    const width = 34;
    const height = 34;

    // Aquest efecte gestiona els missatges d'èxit/error després de la redirecció d'OAuth
    useEffect(() => {
        const error = searchParams.get('error');
        const success = searchParams.get('success');

        if (error) {
            toast.error(t('toast.error'), { description: t('toast.genericError') });
        }
        if (success === 'true') {
            toast.success(t('toast.success'), { description: t('toast.connectedSuccess') });
            router.refresh(); // Refresquem les dades del servidor
        }
        
        // Netegem la URL per a evitar que el missatge es mostri de nou si l'usuari refresca
        if (error || success) {
            router.replace(pathname, { scroll: false });
        }
    }, [searchParams, router, pathname, t]);

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
                toast.success(result.message);
                // Actualitzem l'estat local a l'instant per a una millor UX
                if (provider === 'facebook') {
                    setConnections(prev => ({ ...prev, facebook: false, instagram: false }));
                } else {
                    setConnections(prev => ({ ...prev, [provider]: false }));
                }
                router.refresh(); // Sincronitzem amb el servidor
            } else {
                toast.error(result.message);
            }
        });
    };
    
    // Llista de les teves integracions per a renderitzar-les de manera dinàmica
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
                            <Image src={item.icon} width={width} height={height} alt={`${item.name} logo`} className="flex-shrink-0" unoptimized />
                            <div>
                                <h3 className="font-semibold">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.description}</p>
                            </div>
                        </div>
                        <div className="w-full sm:w-auto flex-shrink-0">
                            {connections[item.name] ? (
                                <div className="flex items-center justify-between w-full sm:gap-4">
                                    <span className="flex items-center gap-2 text-green-500 text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
                                    <Button variant="destructive" size="sm" onClick={() => handleDisconnect(item.name)} disabled={isPending}>
                                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} 
                                        <XCircle className="w-4 h-4 sm:mr-2" /> 
                                        <span className="hidden sm:inline">{t('disconnectButton')}</span>
                                    </Button>
                                </div>
                            ) : (
                                <form action={() => handleConnect(item.name)} className="w-full">
                                    <Button type="submit" disabled={isPending} className="w-full">
                                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
                                        {t('connectButton')}
                                    </Button>
                                </form>
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
                        {connections.facebook ? (
                            <div className="flex items-center justify-between w-full sm:gap-4">
                                <span className="flex items-center gap-2 text-green-500 text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
                                <Button variant="destructive" size="sm" onClick={() => handleDisconnect('facebook')} disabled={isPending}>
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} 
                                    <XCircle className="w-4 h-4 sm:mr-2" /> 
                                    <span className="hidden sm:inline">{t('disconnectButton')}</span>
                                </Button>
                            </div>
                        ) : (
                            <form action={() => handleConnect('facebook')} className="w-full">
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>} 
                                    {t('connectButton')}
                                </Button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}