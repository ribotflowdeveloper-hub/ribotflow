// Ubicació: src/app/[locale]/(app)/_components/module-sidebar.tsx

"use client";

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getCleanPathname } from '@/lib/utils/utils'; // <-- Importa cn
import type { NavItem } from '@/types/app/navigation';

export function ModuleSidebar({ module, onClose, handleNavigation }: {
    module: NavItem;
    onClose: () => void;
    handleNavigation: (item: NavItem) => void;
}) {
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const fullPathname = usePathname();
    const cleanPathname = getCleanPathname(fullPathname, locale);

    if (!module || !module.children) return null;

    return (
        // ✅✅ CANVI APLICAT AQUÍ ✅✅
        <div className={cn(
          "hidden lg:flex w-64 h-full border-r border-border flex-col p-4 flex-shrink-0",
          "bg-slate-100 dark:glass-effect" // Fons clar diferent / Efecte vidre en fosc
        )}>
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold pl-2">{t(module.labelKey)}</h2>
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            </div>
            <nav className="flex flex-col gap-2">
                {module.children.map(item => {
                    const isActive = cleanPathname === item.path;
                    return (
                        <Button
                            key={item.id}
                            variant="ghost"
                            onClick={() => handleNavigation(item)}
                            className={cn(
                                'flex items-center justify-start gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors w-full h-auto text-left',
                                isActive
                                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{t(item.labelKey)}</span>
                        </Button>
                    );
                })}
            </nav>
        </div>
    );
};