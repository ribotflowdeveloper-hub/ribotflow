// src/app/[locale]/(app)/settings/integrations/_components/IntegrationsClient.tsx
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Loader2, XCircle, Mail, Calendar } from 'lucide-react'; // ✅ NOU: Importem 'Calendar'
import {
    // ✅ NOU: Importem les accions actualitzades
    connectGoogleGmailAction, disconnectGoogleGmailAction,
    connectGoogleCalendarAction, disconnectGoogleCalendarAction,
    connectMicrosoftAction, disconnectMicrosoftAction,
    connectLinkedInAction, disconnectLinkedInAction,
    connectFacebookAction, disconnectFacebookAction,
    disconnectCustomEmailAction
} from '../actions';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

import { ImapSmtpDialog } from './ImapSmtpDialog';

import instagram from '@/../public/instagram.jpeg';
import facebook from '@/../public/facebook.jpeg';
import linkedin from '@/../public/linkedin.png';

interface IntegrationsClientProps {
    initialConnectionStatuses: {
        // ✅ NOU: Tipus actualitzat
        google_gmail: boolean;
        google_calendar: boolean;
        microsoft: boolean;
        linkedin: boolean;
        facebook: boolean;
        instagram: boolean;
        custom_email: boolean;
    };
}

// ✅ NOU: Tipus de Provider actualitzat
type Provider = 'google_gmail' | 'google_calendar' | 'microsoft' | 'linkedin' | 'facebook' | 'custom_email';

export function IntegrationsClient({ initialConnectionStatuses }: IntegrationsClientProps) {
    const t = useTranslations('SettingsPage.integrations');
    const router = useRouter();
    const pathname = usePathname();
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
            router.replace(pathname, { scroll: false });
        }
    }, [searchParams, router, pathname, t]);

    const handleConnect = (provider: Provider) => {
        startTransition(() => {
            // ✅ NOU: Lògica de connexió actualitzada
            if (provider === 'google_gmail') connectGoogleGmailAction();
            if (provider === 'google_calendar') connectGoogleCalendarAction();
            if (provider === 'microsoft') connectMicrosoftAction();
            if (provider === 'linkedin') connectLinkedInAction();
            if (provider === 'facebook') connectFacebookAction();
        });
    };

    const handleDisconnect = (provider: Provider) => {
        startTransition(async () => {
            const actionMap = {
                // ✅ NOU: Mapa d'accions actualitzat
                google_gmail: disconnectGoogleGmailAction,
                google_calendar: disconnectGoogleCalendarAction,
                microsoft: disconnectMicrosoftAction,
                linkedin: disconnectLinkedInAction,
                facebook: disconnectFacebookAction,
                custom_email: disconnectCustomEmailAction,
            };
            const result = await actionMap[provider]();

            if (result.success) {
                toast.success(result.message);
                if (provider === 'facebook') {
                    setConnections(prev => ({ ...prev, facebook: false, instagram: false }));
                } else {
                    setConnections(prev => ({ ...prev, [provider]: false }));
                }
                router.refresh();
            } else {
                toast.error(result.message);
            }
        });
    };

    const integrationList = [
        // ✅ NOU: Llista d'integracions actualitzada
        { name: 'google_gmail', title: t('googleTitle'), description: t('googleDescription'), icon: "https://fonts.gstatic.com/s/i/productlogos/googleg/v6/24px.svg" },
        // Hauràs d'afegir 'googleCalendar.title' i 'googleCalendar.description' als teus fitxers de traducció (p.ex. en.json)
        { name: 'google_calendar', title: t('googleCalendar.title'), description: t('googleCalendar.description'), icon: "https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" },
        { name: 'microsoft', title: t('microsoftTitle'), description: t('microsoftDescription'), icon: "https://img.icons8.com/?size=100&id=117562&format=png&color=000000" },
        { name: 'linkedin', title: t('linkedinTitle'), description: t('linkedinDescription'), icon: linkedin },
    ] as const;

    const handleCustomEmailSuccess = () => {
        setConnections(prev => ({ ...prev, custom_email: true }));
        router.refresh();
    }

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="glass-card p-4 sm:p-6 md:p-8 space-y-4">
                <h2 className="text-xl font-semibold mb-2">{t('title')}</h2>
                {/* Integració Correu Personalitzat (sense canvis) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="flex-shrink-0 h-[34px] w-[34px] bg-primary/10 rounded-lg flex items-center justify-center">
                            <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h3 className="font-semibold">{t('customEmail.title')}</h3>
                            <p className="text-sm text-muted-foreground">{t('customEmail.description')}</p>
                        </div>
                    </div>
                    <div className="w-full sm:w-auto flex-shrink-0">
                        {connections.custom_email ? (
                            <div className="flex items-center justify-between w-full sm:gap-4">
                                <span className="flex items-center gap-2 text-green-500 text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
                                <Button variant="destructive" size="sm" onClick={() => handleDisconnect('custom_email')} disabled={isPending}>
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <XCircle className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('disconnectButton')}</span>
                                </Button>
                            </div>
                        ) : (
                            <ImapSmtpDialog onSuccess={handleCustomEmailSuccess}>
                                <Button disabled={isPending} className="w-full">
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {t('connectButton')}
                                </Button>
                            </ImapSmtpDialog>
                        )}
                    </div>
                </div>

                {/* Llista d'integracions principals */}
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
                            {/* ✅ NOU: Lògica de connexió actualitzada */}
                            {connections[item.name] ? (
                                <div className="flex items-center justify-between w-full sm:gap-4">
                                    <span className="flex items-center gap-2 text-green-500 text-sm"><CheckCircle className="w-5 h-5" /> {t('statusConnected')}</span>
                                    <Button variant="destructive" size="sm" onClick={() => handleDisconnect(item.name)} disabled={isPending}>
                                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        <XCircle className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">{t('disconnectButton')}</span>
                                    </Button>
                                </div>
                            ) : (
                                <form action={() => handleConnect(item.name)} className="w-full">
                                    <Button type="submit" disabled={isPending} className="w-full">
                                        {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        {t('connectButton')}
                                    </Button>
                                </form>
                            )}
                        </div>
                    </div>
                ))}

                {/* Secció de Meta (Facebook/Instagram) (sense canvis) */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                        <div className="flex -space-x-2 flex-shrink-0">
                            <Image src={facebook} width={width} height={height} alt="Facebook logo" className="rounded-full ring-2 ring-background" />
                            <Image src={instagram} width={width} height={height} alt="Instagram logo" className="rounded-full ring-2 ring-background" />
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
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    <XCircle className="w-4 h-4 sm:mr-2" />
                                    <span className="hidden sm:inline">{t('disconnectButton')}</span>
                                </Button>
                            </div>
                        ) : (
                            <form action={() => handleConnect('facebook')} className="w-full">
                                <Button type="submit" disabled={isPending} className="w-full">
                                    {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    {t('connectButton')}                       </Button>
                            </form>)}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}