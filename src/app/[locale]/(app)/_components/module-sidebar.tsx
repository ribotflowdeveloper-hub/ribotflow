"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getCleanPathname } from '@/lib/utils';
import type { NavItem } from '@/types/navigation';
import { useNavigationStore } from '@/stores/navigationStore'; // ✅ NOU

/**
 * @summary Barra lateral para un módulo específico (submenú).
 */
export function ModuleSidebar({ module, onClose, onSubItemClick }: {
    module: NavItem;
    onClose: () => void;
    onSubItemClick: () => void; // ✅ NUEVO: Prop para notificar el clic.
}) {
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const fullPathname = usePathname();
    const cleanPathname = getCleanPathname(fullPathname, locale);
    const setIsNavigating = useNavigationStore((state) => state.setIsNavigating); // ✅ NOU


    if (!module || !module.children) return null;

    return (
         // 'hidden lg:flex' oculta el submenú en móvil/tablet
        <div className="hidden lg:flex w-64 h-full glass-effect border-r border-border flex-col p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-6">

                <h2 className="text-lg font-bold pl-2">{t(module.labelKey as string)}</h2>

                <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronLeft className="h-5 w-5" />

                </Button>

            </div>
            <nav className="flex flex-col gap-2">
                {module.children.map(item => {
                    const isActive = cleanPathname === item.path;
                    return (
                        <Link // Tornem a un <Link> simple i pur
                            key={item.id}
                            href={`/${locale}${item.path}`}
                            // ✅ NOU: Activem l'estat de navegació en fer clic
                            onClick={() => {
                                // Notificamos al layout padre para que cierre el menú.
                                onSubItemClick();

                                // Mantenemos la lógica para mostrar el estado de carga.

                                if (fullPathname !== `/${locale}${item.path}`) {
                                    setIsNavigating(true);
                                }
                            }}
                            className={cn(
                                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors',
                                isActive
                                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                            )}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{t(item.labelKey)}</span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
};