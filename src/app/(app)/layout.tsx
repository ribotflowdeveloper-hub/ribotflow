"use client";

import React, { useState, useEffect, Suspense } from 'react'; // ✅ 1. IMPORTEM SUSPENSE
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { navModules } from '@/config/navigation';
import { MainSidebar } from './_components/main-sidebar';
import { ModuleSidebar } from './_components/module-sidebar';
import Loading from './loading'; // ✅ 2. IMPORTEM EL TEU COMPONENT DE CÀRREGA
import type { NavItem } from '@/config/navigation';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);

    useEffect(() => {
        const currentModule = navModules.find(module => 
            !module.isSingle && pathname.startsWith(module.basePath!)
        );
        setActiveModule(currentModule || null);
        if (currentModule) {
            setIsModuleSidebarOpen(true);
        } else {
            setIsModuleSidebarOpen(false);
        }
    }, [pathname]);

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
                    {/* ✅ 3. EMBOLCALLEM ELS FILLS AMB SUSPENSE */}
                    <Suspense fallback={<Loading />}>
                        {children}
                    </Suspense>

                </div>
            </main>
        </div>
    );
}