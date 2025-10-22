// Ubicació: src/app/[locale]/(app)/_components/main-sidebar.tsx

"use client";

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils/utils'; // <-- Importa cn

import { useNavigationStore } from '@/stores/navigationStore';
import { navModules, bottomItems } from '@/config/navigation';
import type { NavItem as NavItemType } from '@/types/app/navigation';

import { NavItem } from './NavItem';

interface MainSidebarProps {
    onModuleSelect: (module: NavItemType) => void;
    onOpenSignOutDialog: () => void;
    onNotImplemented: (e: React.MouseEvent) => void;
}

export function MainSidebar({ onModuleSelect, onOpenSignOutDialog, onNotImplemented }: MainSidebarProps) {
    const t = useTranslations('Navigation');
    const { isNavigating } = useNavigationStore();
    const { toggleChatbot } = useNavigationStore();

    const handleItemClick = (e: React.MouseEvent<HTMLAnchorElement>, item: NavItemType) => {
        if (item.notImplemented) {
            e.preventDefault();
            onNotImplemented(e);
            return;
        }

        if (item.id === 'ia') {
            e.preventDefault();
            toggleChatbot();
            return;
        }

        if (!item.isSingle) {
            e.preventDefault();
        }
        onModuleSelect(item);
    };

    return (
        // ✅✅ CANVI APLICAT AQUÍ ✅✅
        <aside className={cn(
          "hidden lg:flex w-24 h-full border-r border-border p-4 flex-col items-center z-20",
          "bg-slate-50 dark:glass-effect" // Fons clar / Efecte vidre en fosc
        )}>
            {/* Logo a la part superior */}
            <div className="flex items-center justify-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-r to-pink-500 rounded-lg flex items-center justify-center overflow-hidden">
                    {isNavigating ? (
                        <video
                            src="/videoLoading.webm"
                            autoPlay muted loop playsInline
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <Image
                            src="/icon0.svg"
                            alt={t('logoAlt')}
                            className="object-cover"
                            priority
                            width={64}
                            height={64}
                        />
                    )}
                </div>
            </div>

            {/* Navegació principal */}
            <nav className="flex-1 flex flex-col items-center gap-4 z-20">
                {navModules.map(item => (
                    <NavItem key={item.id} item={item} onClick={handleItemClick} t={t} />
                ))}
            </nav>

            {/* Elements de la part inferior */}
            <div className="flex flex-col items-center gap-4 border-t border-border pt-4 mt-4">
                {bottomItems.map(item => (
                    <NavItem key={item.id} item={item} onClick={handleItemClick} t={t} />
                ))}

                {/* Botó de tancar sessió */}
                <div
                    onClick={onOpenSignOutDialog}
                    className="flex items-center justify-center h-12 w-12 rounded-lg text-muted-foreground hover:bg-muted cursor-pointer group relative"
                    role="button"
                    aria-label={t('signOut')}
                >
                    <LogOut className="w-6 h-6" />
                    <span className="absolute left-16 p-2 px-3 text-sm font-medium bg-popover text-popover-foreground rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{t('signOut')}</span>
                </div>
            </div>
        </aside>
    );
}