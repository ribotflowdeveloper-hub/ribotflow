"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useUser } from '@/hooks/useUser';
import { MainSidebar } from './main-sidebar';
import { ModuleSidebar } from './module-sidebar';
import { MobileMenu } from './MobileMenu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { navModules } from '@/config/navigation';
import type { NavItem } from '@/types/navigation';
import { useNavigationStore } from '@/stores/navigationStore';
import logoRibot from '@/../public/icon1.png';
import Image from 'next/image';
import { logoutAction } from '@/app/[locale]/auth/actions'; // ✅ 1. Importem la nova acció

export function AppClientLayout({ children, locale }: { children: ReactNode, locale: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const t = useTranslations('Navigation');
    const { setIsNavigating } = useNavigationStore();
    const { user, teamRole } = useUser();

    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

    useEffect(() => {
        setIsNavigating(false);
        const prefix = `/${locale}`;
        const pathnameWithoutLocale = pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;
        const currentModule = navModules.find(module => !module.isSingle && module.basePath && pathnameWithoutLocale.startsWith(module.basePath));
        setActiveModule(currentModule || null);
        if (!currentModule) {
            setIsModuleSidebarOpen(false);
        }
    }, [pathname, locale, setIsNavigating]);

    const handleNavigation = (item: NavItem) => {
        const plan = user?.app_metadata?.active_team_plan;
        if (item.requiredPlan && !item.requiredPlan.includes(plan)) {
            toast.info("Funcionalitat Premium", {
                description: `El mòdul '${t(item.labelKey)}' només està disponible als plans ${item.requiredPlan.join(' o ')}.`,
                action: {
                    label: "Veure Plans",
                    onClick: () => router.push(`/${locale}/settings/billing`),
                },
            });
            return;
        }

        if (item.allowedRoles && (!teamRole || !item.allowedRoles.includes(teamRole))) {
            toast.error("Accés restringit", { description: "No tens els permisos necessaris per a accedir a aquesta secció." });
            return;
        }

        // Només naveguem si la ruta és diferent
        if (pathname !== `/${locale}${item.path}`) {
            setIsNavigating(true);
            router.push(`/${locale}${item.path}`);
        }

        // Tanquem el submenú si naveguem a un lloc nou
        setIsModuleSidebarOpen(false);
    };

    /**
     * Aquesta funció ara gestiona els clics a la barra principal.
     * Decideix si ha de navegar o només obrir un submenú.
     */
    const handleMainMenuClick = (item: NavItem) => {
        if (item.isSingle) {
            // Si és un enllaç directe (Dashboard, Network), navega
            handleNavigation(item);
        } else {
            // Si és un mòdul amb fills (CRM, Finances), només gestiona el submenú
            handleModuleSelect(item);
        }
    };

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

    // ✅ 2. La funció 'handleSignOut' ara simplement crida a l'acció
    const handleSignOut = () => {
        logoutAction();
    };

    const handleNotImplementedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info(t('comingSoon'), { description: t('featureUnavailable') });
    };

    return (
        <div className="h-screen w-screen flex flex-col lg:flex-row bg-background text-foreground overflow-hidden">
            <MainSidebar
                onModuleSelect={handleMainMenuClick} // ✅ Utilitzem la nova funció
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
                        // ✅ CORRECCIÓ: Passem la funció de navegació completa
                        handleNavigation={handleNavigation}
                    />
                )}
            </motion.div>

            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="lg:hidden flex items-center justify-between p-4 border-b border-border flex-shrink-0">
                    <MobileMenu
                        onOpenSignOutDialog={() => setIsSignOutDialogOpen(true)}
                        onNotImplementedClick={handleNotImplementedClick}
                        handleNavigation={handleNavigation}
                    />
                    <span className="font-bold text-lg">Ribotflow</span>
                    <Image src={logoRibot} alt={t('logoAlt')} className="object-cover" priority height={40} />
                </header>
                <main className="flex-1 overflow-y-auto">
                    <div className="h-full p-4 sm:p-6 md:p-8">{children}</div>
                </main>
            </div>

            <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('signOutConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('signOutConfirmDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90">{t('confirmSignOut')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}