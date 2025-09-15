"use client";

import React, { useState, useEffect, Suspense, ReactNode } from 'react';
import { usePathname } from 'next/navigation'; // Assegura't que l'import és correcte
import { motion } from 'framer-motion';
import { navModules } from '@/config/navigation';
import { MainSidebar } from './main-sidebar';
import { ModuleSidebar } from './module-sidebar';
import Loading from '../loading';
import type { NavItem } from '@/config/navigation';

export function AppClientLayout({ children, locale }: { children: ReactNode, locale: string }) {
    const pathname = usePathname();
    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);

    useEffect(() => {
        const prefix = `/${locale}`;
        const pathnameWithoutLocale = pathname.startsWith(prefix)
            ? pathname.slice(prefix.length) || '/'
            : pathname;

        const currentModule = navModules.find(module => 
            !module.isSingle && pathnameWithoutLocale.startsWith(module.basePath!)
        );
        setActiveModule(currentModule || null);
        
        if (currentModule) {
            setIsModuleSidebarOpen(true);
        } else {
            setIsModuleSidebarOpen(false);
        }
    }, [pathname, locale]);

    // ✅ AQUÍ TENS LA LÒGICA COMPLETA DE 'handleModuleSelect'
    const handleModuleSelect = (module: NavItem) => {
        // Si el mòdul clicat té un submenú ('!isSingle')...
        if (!module.isSingle) {
            // ... i ja era el mòdul actiu, simplement tanquem/obrim la barra (efecte 'toggle').
            if (activeModule?.id === module.id) {
                setIsModuleSidebarOpen(!isModuleSidebarOpen);
            } else {
                // Si és un mòdul nou, l'activem i ens assegurem que la barra estigui oberta.
                setActiveModule(module);
                setIsModuleSidebarOpen(true);
            }
        } else {
            // Si és un enllaç simple (com el Dashboard), no hi ha submenú, així que tanquem la barra.
            setActiveModule(null);
            setIsModuleSidebarOpen(false);
        }
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
                    />
                )}
            </motion.div>

            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="h-full p-4 sm:p-6 md:p-8">
                    <Suspense fallback={<Loading />}>
                        {children}
                    </Suspense>
                </div>
            </main>
        </div>
    );
}