"use client"; // ✅ També client component.

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { cn, getCleanPathname } from '@/lib/utils'; // ✅ Importem la nova funció
import type { NavItem } from '@/types/navigation'; // ✅ Importem el tipus des del seu fitxer

// ✅ Barra lateral per a un mòdul específic (submenú)
export function ModuleSidebar({ module, onClose }: { module: NavItem; onClose: () => void; }) {
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const fullPathname = usePathname();
    const cleanPathname = getCleanPathname(fullPathname, locale);
    
    if (!module || !module.children) return null; // ✅ Si no hi ha mòdul o subelements, no renderitzem res.

    return (
        <div className="w-64 h-full glass-effect border-r border-border flex flex-col p-4 flex-shrink-0">
            {/* ✅ Capçalera amb títol del mòdul i botó per tancar el submenú */}
            <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold pl-2">{t(module.labelKey as any)}</h2> {/* ✅ Títol traduït */}
            <Button variant="ghost" size="icon" onClick={onClose}>
                    <ChevronLeft className="h-5 w-5" />
                </Button>
            </div>
            
            {/* ✅ Llistat dels subelements del mòdul */}
            <nav className="flex flex-col gap-2">
                {module.children.map(item => {
                    const isActive = cleanPathname === item.path;
                    return (
                        <Link
                            key={item.id}
                            href={`/${locale}${item.path}`}
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