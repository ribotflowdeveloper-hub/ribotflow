"use client";

import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, getCleanPathname } from '@/lib/utils/utils';
import type { NavItem } from '@/types/navigation';

/**
 * @summary Barra lateral para un módulo específico (submenú).
 * AHORA GESTIONA LA NAVEGACIÓN A TRAVÉS DE UNA FUNCIÓN PARA COMPROBAR PERMISOS.
 */
export function ModuleSidebar({ module, onClose, handleNavigation }: {
    module: NavItem;
    onClose: () => void;
    handleNavigation: (item: NavItem) => void; // ✅ Acceptem la funció de navegació
}) {
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const fullPathname = usePathname();
    const cleanPathname = getCleanPathname(fullPathname, locale);

    if (!module || !module.children) return null;

    return (
        <div className="hidden lg:flex w-64 h-full glass-effect border-r border-border flex-col p-4 flex-shrink-0">
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
                        // ✅ CORRECCIÓ: Hem canviat <Link> per <Button> per a controlar el clic
                        <Button
                            key={item.id}
                            variant="ghost" // Usem 'ghost' per a que sembli un enllaç
                            onClick={() => handleNavigation(item)} // Cridem a la funció que comprova els permisos
                            className={cn(
                                'flex items-center justify-start gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors w-full h-auto text-left', // 'text-left' per a alinear
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