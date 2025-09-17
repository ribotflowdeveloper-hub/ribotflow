"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from "sonner";
import { createClient } from '@/lib/supabase/client';
import { LogOut } from 'lucide-react';
import { navModules, bottomItems } from '@/config/navigation';
import { cn, getCleanPathname } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import type { NavItem } from '@/types/navigation';
import logoRibot from '@/../public/icon1.png';
import Image from 'next/image';
import { useNavigationStore } from '@/stores/navigationStore'; // ✅ NOU: Importem el nostre magatzem

export function MainSidebar({ onModuleSelect }: { onModuleSelect: (module: NavItem) => void }) {
    const fullPathname = usePathname();
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);
    const supabase = createClient();
    const { isNavigating, setIsNavigating } = useNavigationStore();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = '/login';
    };

    const handleNotImplemented = (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info(t('comingSoon'), { description: t('featureUnavailable') });
    };

    const NavItemComponent = ({ item }: { item: NavItem }) => {
        const activeCheckPath = item.basePath || item.path;
        const isActive = getCleanPathname(fullPathname, locale).startsWith(activeCheckPath);

        /**
         * @summary Gestiona el clic en qualsevol icona de la barra principal.
         */
        const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            // Notifiquem sempre al component pare per gestionar l'obertura/tancament del submenú
            onModuleSelect(item);
            
            const newFullPath = `/${locale}${item.path}`;

            // ✅ CORRECCIÓ CLAU: Mirem si l'element és un enllaç directe
            if (item.isSingle) {
                // Si és un enllaç directe (com el Dashboard), activem l'animació si naveguem a una nova pàgina
                if (fullPathname !== newFullPath) {
                    setIsNavigating(true);
                }
            } else {
                // Si NO és un enllaç directe (és un mòdul com CRM), només obrim el submenú.
                // Prevenim la navegació per defecte del Link.
                e.preventDefault();
            }
        };
        return (
            // ✅ 2. Embolcallem tot amb el TooltipProvider.
            <TooltipProvider delayDuration={100}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link
                            href={`/${locale}${item.path}`}
                            onClick={handleClick}
                            className={cn(
                                'flex items-center justify-center h-12 w-12 rounded-lg transition-colors relative',
                                isActive ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'
                            )}
                        >
                            <item.icon className="w-6 h-6" />
                        </Link>
                    </TooltipTrigger>
                    {/* ✅ 3. El contingut del Tooltip (el text) es renderitza en un portal,
                        la qual cosa fa que sempre es mostri per sobre de la resta. */}
                    <TooltipContent side="right" className="ml-2">
                        <p>{t(item.labelKey as string)}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    };
    return (
        <>
            {/* ✅ Contenidor principal de la barra lateral */}
            <aside className="w-24 h-full glass-effect border-r border-border p-4 flex flex-col items-center">
                {/* ✅ Logo a la part superior */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-r to-pink-500 rounded-lg flex items-center justify-center overflow-hidden">
                        {isNavigating ? (
                            <video
                                src="/videoLoading.webm"
                                autoPlay
                                muted
                                loop
                                playsInline // Important per a dispositius mòbils
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <Image
                                src={logoRibot} // Assegura't que 'logo' estigui importat
                                alt={t('logoAlt')}
                                className="object-cover"
                                priority
                            />
                        )}
                    </div>
                </div>

                {/* ✅ Navegació principal */}
                <nav className="flex-1 flex flex-col items-center gap-4 z-20">
                    {navModules.map(item =>
                        // ✅ CORREGIT: Hem eliminat la propietat 'currentPath'
                        <NavItemComponent key={item.id} item={item} />
                    )}
                </nav>

                {/* ✅ Elements de la part inferior: funcions addicionals i logout */}
                <div className="flex flex-col items-center gap-4 border-t border-border pt-4 mt-4">
                    {bottomItems.map(item => (
                        item.notImplemented
                            ? <a key={item.id} href="#" onClick={handleNotImplemented}
                                className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted group relative">
                                <item.icon className="w-6 h-6" />
                                <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                    {t(item.labelKey as string)}
                                </span></a>
                            : <NavItemComponent key={item.id} item={item} />

                    ))}
                    {/* ✅ Botó de tancar sessió */}
                    <div onClick={() => setIsSignOutDialogOpen(true)} className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer group relative">
                        <LogOut className="w-6 h-6" />
                        <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('signOut')}</span>
                    </div>
                </div>
            </aside>

            {/* ✅ Diàleg de confirmació per tancar sessió */}
            <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('signOutConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t('signOutConfirmDescription')}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t('confirmSignOut')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}