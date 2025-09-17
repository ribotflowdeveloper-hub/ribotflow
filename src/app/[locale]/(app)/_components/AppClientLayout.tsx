"use client";

import React, { useState, useEffect, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { navModules } from '@/config/navigation';
import { MainSidebar } from './main-sidebar';
import { ModuleSidebar } from './module-sidebar';
import type { NavItem } from '@/types/navigation';
import { useNavigationStore } from '@/stores/navigationStore';

/**
 * @summary Layout principal de cliente que gestiona la estructura de navegación de dos niveles.
 */
export function AppClientLayout({ children, locale }: { children: ReactNode, locale: string }) {
    const pathname = usePathname();
    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);
    const { setIsNavigating } = useNavigationStore();

    /**
     * @effect
     * @summary Sincronitza el mòdul actiu amb la ruta actual.
     * Aquesta versió corregida NO obre el submenú automàticament.
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

        // ✅ CORRECCIÓ CLAU: Només tanquem el submenú si naveguem a una pàgina
        // que no pertany a cap mòdul. Ja no el forcem a obrir-se.
        if (!currentModule) {
            setIsModuleSidebarOpen(false);
        }
    }, [pathname, locale, setIsNavigating]);

    /**
     * @summary Gestiona el clic en el menú principal (iconos).
     * Aquesta funció és ara l'ÚNICA responsable d'obrir el submenú.
     */
    const handleModuleSelect = (module: NavItem) => {
        if (!module.isSingle) {
            // Si cliquem a la icona del mòdul que ja està actiu, fem un 'toggle'.
            if (activeModule?.id === module.id) {
                setIsModuleSidebarOpen(!isModuleSidebarOpen);
            } else {
                // Si cliquem a un mòdul nou, l'activem i obrim el seu menú.
                setActiveModule(module);
                setIsModuleSidebarOpen(true);
            }
        } else {
            // Si és un enllaç simple (com Dashboard), tanquem qualsevol submenú obert.
            setActiveModule(null);
            setIsModuleSidebarOpen(false);
        }
    };

    /**
     * @summary S'executa quan es fa clic en un enllaç del submenú.
     */
    const handleSubItemClick = () => {
        // En fer clic a un sub-element, sempre tanquem el menú.
        setIsModuleSidebarOpen(false);
    };

    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            <MainSidebar onModuleSelect={handleModuleSelect} />
            
            <motion.div
                className="overflow-hidden flex-shrink-0"
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

            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="h-full p-4 sm:p-6 md:p-8">
                    {children}
                </div>
            </main>
        </div>
    );
}