import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import ModuleSidebar from './ModuleSidebar';
import { navModules } from '@/config/navigation';
import { Menu } from 'lucide-react';
import { motion } from 'framer-motion'; // Només necessitem motion aquí

const ProtectedLayout = () => {
    const location = useLocation();
    const [activeModule, setActiveModule] = useState(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        const currentModule = navModules.find(module => 
            !module.isSingle && location.pathname.startsWith(module.basePath)
        );
        setActiveModule(currentModule || null);

        if (!currentModule) {
            setIsModuleSidebarOpen(false);
        }
        
        setIsMobileMenuOpen(false);
    }, [location.pathname]);

    const handleModuleSelect = (module) => {
        if (activeModule?.id === module.id) {
            setIsModuleSidebarOpen(!isModuleSidebarOpen);
        } else {
            setIsModuleSidebarOpen(true);
        }
    };

    return (
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            {/* Sidebar principal (escriptori) */}
            <div className="hidden md:flex flex-shrink-0 z-20">
                <Sidebar onModuleSelect={handleModuleSelect} />
            </div>

            {/* LA CLAU DE L'ANIMACIÓ 'PUSH' */}
            {/* Aquest contenidor animarà la seva amplada, empenyent el 'main' */}
            <motion.div
                className="hidden md:flex flex-shrink-0 overflow-hidden"
                initial={false}
                animate={{ width: isModuleSidebarOpen && activeModule ? '16rem' : '0rem' }} // 16rem = w-64
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
                {activeModule && (
                    <ModuleSidebar 
                        module={activeModule}
                        onClose={() => setIsModuleSidebarOpen(false)}
                    />
                )}
            </motion.div>

            {/* Contingut Principal */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                <header className="p-4 md:hidden border-b border-border flex-shrink-0">
                    <button onClick={() => setIsMobileMenuOpen(true)}> <Menu className="w-6 h-6" /> </button>
                </header>
                <div className="h-full p-4 sm:p-6 md:p-8">
                    <Outlet />
                </div>
            </main>

            {/* Menú de mòbil (overlay) - Aquest no canvia */}
            {isMobileMenuOpen && (
                 <div className="absolute inset-0 z-50 flex md:hidden" role="dialog">
                    <div className="flex-shrink-0 z-10"> <Sidebar onClose={() => setIsMobileMenuOpen(false)} /> </div>
                    {activeModule && (
                         <div className="w-64 flex-shrink-0 border-r border-border">
                             <ModuleSidebar module={activeModule} onLinkClick={() => setIsMobileMenuOpen(false)} />
                         </div>
                    )}
                    <div className="flex-1 bg-black/60" onClick={() => setIsMobileMenuOpen(false)}></div>
                </div>
            )}
        </div>
    );
};

export default ProtectedLayout;