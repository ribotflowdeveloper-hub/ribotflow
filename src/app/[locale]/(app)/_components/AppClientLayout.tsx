/**
 * @file AppClientLayout.tsx
 * @summary Layout principal de cliente que gestiona la estructura de navegación de dos niveles,
 * adaptándose a vistas de escritorio y móvil.
 */
"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { useTranslations } from 'next-intl';

// Importació de components
import { MainSidebar } from './main-sidebar';
import { ModuleSidebar } from './module-sidebar';
import { MobileMenu } from './MobileMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Importació de tipus i estats globals
import { navModules } from '@/config/navigation';
import type { NavItem } from '@/types/navigation';
import { useNavigationStore } from '@/stores/navigationStore';

import logoRibot from '@/../public/icon1.png';
import Image from 'next/image';

export function AppClientLayout({ children, locale }: { children: ReactNode, locale: string }) {
    const pathname = usePathname();
    const t = useTranslations('Navigation');
    const { setIsNavigating } = useNavigationStore();
    const supabase = createClient();

    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

    /**
     * @effect
     * @summary Sincronitza el menú actiu amb la ruta actual i gestiona l'estat de càrrega.
     */
    useEffect(() => {
        setIsNavigating(false);

        const prefix = `/${locale}`;
        const pathnameWithoutLocale = pathname.startsWith(prefix)
            ? pathname.slice(prefix.length) || '/'
            : pathname;

        const currentModule = navModules.find(module =>
            !module.isSingle && module.basePath && pathnameWithoutLocale.startsWith(module.basePath)
        );

        setActiveModule(currentModule || null);

        if (!currentModule) {
            setIsModuleSidebarOpen(false);
        }
    }, [pathname, locale, setIsNavigating]);

    /**
     * @summary Gestiona el clic a la barra d'icones principal (escriptori).
     */
    const handleModuleSelect = (module: NavItem) => {
        if (!module.isSingle) {
            if (activeModule?.id === module.id) {
                setIsModuleSidebarOpen(!isModuleSidebarOpen);
            } else {
                setActiveModule(module);
                setIsModuleSidebarOpen(true);
            }
        } else {
            setActiveModule(null);
            setIsModuleSidebarOpen(false);
        }
    };

    /**
     * @summary S'executa en fer clic a un enllaç del submenú.
     * ✅ CORRECCIÓ: Ara sempre tanca el submenú, independentment de la mida de la pantalla.
     */
    const handleSubItemClick = () => {
        setIsModuleSidebarOpen(false);
    };

    /**
     * @summary Funcions per als botons del menú.
     */
    const handleSignOut = async () => {
        await supabase.auth.signOut();
        window.location.href = `/${locale}/login`;
    };

    const handleNotImplementedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info(t('comingSoon'), { description: t('featureUnavailable') });
    };

    return (
        <div className="h-screen w-screen flex flex-col lg:flex-row bg-background text-foreground overflow-hidden">
            {/* --- NAVEGACIÓ D'ESCRIPTORI --- */}
            <MainSidebar 
                onModuleSelect={handleModuleSelect} 
                onOpenSignOutDialog={() => setIsSignOutDialogOpen(true)}
                onNotImplemented={handleNotImplementedClick} 
            />
            <motion.div
                className="hidden lg:block overflow-hidden flex-shrink-0"
                initial={false}
                animate={{ width: isModuleSidebarOpen && activeModule ? '16rem' : '0rem' }}
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
                {activeModule && (
                    <ModuleSidebar
                        module={activeModule}
                        onClose={() => setIsModuleSidebarOpen(false)}
                        onSubItemClick={handleSubItemClick}
                    />
                )}
            </motion.div>

            {/* --- CONTINGUT PRINCIPAL --- */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="lg:hidden flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                    <MobileMenu 
                        onOpenSignOutDialog={() => setIsSignOutDialogOpen(true)} 
                        onNotImplementedClick={handleNotImplementedClick} 
                    />
                    <span className="font-bold text-lg">Ribotflow</span>
                    <Image
                        src={logoRibot}
                        alt={t('logoAlt')}
                        className="object-cover"
                        priority
                        height={40}
                    />
                </header>
                <main className="flex-1 overflow-y-auto">
                    <div className="h-full p-4 sm:p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
            
            {/* DIÀLEG DE CONFIRMACIÓ */}
            <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('signOutConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('signOutConfirmDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {t('confirmSignOut')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
