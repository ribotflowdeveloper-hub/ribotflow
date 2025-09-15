"use client";

import React, { useState, useEffect, Suspense } from 'react';
// 'usePathname' és un hook de Next.js que et dona la ruta de la URL actual.
import { usePathname } from 'next/navigation';
// 'motion' és el component principal de Framer Motion per crear animacions.
import { motion } from 'framer-motion';
// Importem la configuració de la navegació.
import { navModules } from '@/config/navigation';
import { MainSidebar } from './_components/main-sidebar';
import { ModuleSidebar } from './_components/module-sidebar';
// Importem el component de càrrega que es mostrarà amb Suspense.
import Loading from './loading';
import type { NavItem } from '@/config/navigation';

/**
 * Aquest és el Layout principal per a totes les pàgines protegides de l'aplicació.
 * S'encarrega de renderitzar la navegació principal (les dues barres laterals)
 * i de gestionar quin submenú (mòdul) està actiu.
 * Com que gestiona estats interactius (useState, useEffect), ha de ser un Client Component ("use client").
 */
export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
    // Obtenim la ruta actual per saber quina secció de la navegació ha d'estar activa.
    const pathname = usePathname();
    
    // --- ESTATS DEL COMPONENT ---
    // 'activeModule' guarda l'objecte de configuració del mòdul actiu (ex: CRM, Finances).
    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    // 'isModuleSidebarOpen' controla la visibilitat de la barra lateral secundària.
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);

    /**
     * Aquest 'useEffect' s'executa cada cop que la ruta de la URL ('pathname') canvia.
     * La seva funció és determinar si la nova ruta pertany a un mòdul amb submenú
     * i, si és així, activar i obrir la barra lateral corresponent.
     */
    useEffect(() => {
        // Busquem a la nostra configuració de navegació si la ruta actual comença
        // pel 'basePath' d'algun dels mòduls.
        const currentModule = navModules.find(module => 
            !module.isSingle && pathname.startsWith(module.basePath!)
        );
        // Actualitzem l'estat amb el mòdul trobat (o null si no n'hi ha).
        setActiveModule(currentModule || null);
        
        // Si hem trobat un mòdul, ens assegurem que la seva barra lateral estigui oberta.
        if (currentModule) {
            setIsModuleSidebarOpen(true);
        } else {
            setIsModuleSidebarOpen(false);
        }
    }, [pathname]); // Aquest efecte només es tornarà a executar si 'pathname' canvia.

    /**
     * Funció que es passa com a 'prop' a la 'MainSidebar'. Es crida quan l'usuari
     * fa clic a una de les icones de la navegació principal.
     */
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
        // Estructura principal de la interfície amb flexbox.
        <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
            {/* Barra de navegació principal (la de les icones grans). */}
            <MainSidebar onModuleSelect={handleModuleSelect} />
            
            {/* Contenidor per a la barra lateral secundària (submenú).
                Utilitzem 'motion.div' de Framer Motion per animar la seva amplada ('width'). */}
            <motion.div
                className="overflow-hidden flex-shrink-0"
                initial={false} // No volem animació en la càrrega inicial.
                // L'amplada s'anima a '16rem' o '0rem' depenent de l'estat.
                animate={{ width: isModuleSidebarOpen && activeModule ? '16rem' : '0rem' }}
                // Definim una transició de tipus 'spring' (molla) per a un efecte més natural.
                transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            >
                {/* Només renderitzem el contingut de la barra si hi ha un mòdul actiu. */}
                {activeModule && (
                    <ModuleSidebar 
                        module={activeModule}
                        onClose={() => setIsModuleSidebarOpen(false)}
                    />
                )}
            </motion.div>

            {/* Contingut principal de la pàgina. */}
            <main className="flex-1 flex flex-col overflow-y-auto">
                <div className="h-full p-4 sm:p-6 md:p-8">
                    {/* 'Suspense' és un component de React que permet mostrar una interfície de 'fallback'
                        (en aquest cas, el nostre component 'Loading') mentre els seus fills ('children')
                        estan carregant dades. Next.js ho fa automàticament amb l'App Router. */}
                    <Suspense fallback={<Loading />}>
                        {/* 'children' representa el contingut de la pàgina actual (ex: Dashboard, Facturació, etc.). */}
                        {children}
                    </Suspense>
                </div>
            </main>
        </div>
    );
}