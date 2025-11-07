"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { type UsageCheckResult } from '@/lib/subscription/subscription';
import { useAppNavigation } from '@/hooks/useAppNavigation';
import { useNavigationStore } from '@/stores/navigationStore';
import { MainSidebar } from './main-sidebar';
import { ModuleSidebar } from './module-sidebar';
import { MobileMenu } from './MobileMenu';
import { Chatbot } from '@/components/chatbot/Chatbot';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { logoutAction } from '@/app/[locale]/(auth)/auth/actions';

// ✅ INTERFÍCIE AMB AI LIMIT OPCIONAL
interface AppClientLayoutProps {
    children: React.ReactNode;
    locale: string;
    aiLimitStatus?: UsageCheckResult; // ara opcional
}

export function AppClientLayout({ children, aiLimitStatus }: AppClientLayoutProps) {
    const t = useTranslations('Navigation');
    const { isChatbotOpen } = useNavigationStore();
    const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

    const {
        activeModule,
        isModuleSidebarOpen,
        setIsModuleSidebarOpen,
        handleNavigation,
        handleMainMenuClick,
    } = useAppNavigation();

    const handleSignOut = () => logoutAction();

    const handleNotImplementedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        toast.info(t('comingSoon'), { description: t('featureUnavailable') });
    };

    // ✅ Fallback si aiLimitStatus és undefined
    const safeAiLimitStatus: UsageCheckResult = aiLimitStatus ?? { allowed: false, current: 0, max: 0 };

    return (
        <div className="h-screen w-screen flex flex-col lg:flex-row bg-background text-foreground overflow-hidden">
            <MainSidebar
                onModuleSelect={handleMainMenuClick}
                onOpenSignOutDialog={() => setIsSignOutDialogOpen(true)}
                onNotImplemented={handleNotImplementedClick}
                aiLimitStatus={safeAiLimitStatus} // Passem el fallback
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
                <header className="lg:hidden flex items-center justify-between border-b p-1 border-border flex-shrink-0">
                    <Image
                        src="/icon0.svg"
                        alt={t('logoAlt')}
                        className="object-cover"
                        priority
                        height={30}
                        width={30}
                    />
                    <span className="font-bold text-lg">{t('brandNameMobile')}</span>
                    <MobileMenu
                        onOpenSignOutDialog={() => setIsSignOutDialogOpen(true)}
                        onNotImplementedClick={handleNotImplementedClick}
                        handleNavigation={handleNavigation}
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
                        <AlertDialogAction
                            onClick={handleSignOut}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {t('confirmSignOut')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
