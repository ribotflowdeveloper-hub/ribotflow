// Ubicació: /app/(app)/components/AppClientLayout.tsx

"use client";

import React, { useState, ReactNode } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

// Hooks i Stores
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useNavigationStore } from '@/stores/navigationStore';

// Components
import { MainSidebar } from './main-sidebar';
import { ModuleSidebar } from './module-sidebar';
import { MobileMenu } from './MobileMenu';
import { Chatbot } from '@/components/chatbot/Chatbot';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

// Accions
import { logoutAction } from '@/app/[locale]/(auth)/auth/actions';

// Imatges i tipus
export function AppClientLayout({ children }: { children: ReactNode, locale: string }) {
    const t = useTranslations('Navigation');
    const { isChatbotOpen } = useNavigationStore();
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

    // ✅ Tota la lògica complexa ve del nostre hook personalitzat!
    const {
        activeModule,
        isModuleSidebarOpen,
        setIsModuleSidebarOpen,
        handleNavigation,
        handleMainMenuClick,
    } = useAppNavigation();

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
                onModuleSelect={handleMainMenuClick}
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
                    <Image
                        src="/icon0.svg"
                        alt={t('logoAlt')}
                        className="object-cover"
                        priority height={40}
                        width={64}   // Substitueix per l'amplada real de la teva imatge

                    />

                </header>
                <main className="flex-1 overflow-y-auto">
                    <div className="h-full p-4 sm:p-6 md:p-8">{children}</div>
                </main>
                {isChatbotOpen && <Chatbot />}
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