// Ubicació: /hooks/useAppNavigation.ts

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';
// ✅ 1. Importem els setters que ens falten de l'store
import { useNavigationStore } from '@/stores/navigationStore';
import { navModules } from '@/config/navigation';
import type { NavItem } from '@/types/app/navigation';

export function useAppNavigation() {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Navigation');
    
    // ✅ 2. OBTENIM TOTES LES DADES NECESSÀRIES
    // Obtenim l'objecte 'activeTeam' que ens proporciona el hook 'useUser'
    const { user, teamRole, activeTeam } = useUser();
    // Obtenim la funció 'setActiveTeam' del nostre store
    const { setIsNavigating, setActiveTeam } = useNavigationStore();

    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);

    // ---
    // ✅ 3. PUNT CLAU: SINCRONITZACIÓ DE L'ESTAT
    // ---
    // Aquest useEffect s'executarà quan el hook useUser carregui les dades de l'usuari.
    // Llavors, agafarà l'activeTeam (que ve del UserContext) i l'establirà
    // al nostre store global (Zustand), fent-lo accessible a tota l'aplicació
    // (com per exemple, a NetworkClient.tsx).
    useEffect(() => {
        // Si 'activeTeam' encara s'està carregant, pot ser 'undefined'.
        // Ens assegurem de passar 'null' si no està definit.
        console.log("[useAppNavigation] Sincronitzant activeTeam amb el store:", activeTeam);
        setActiveTeam(activeTeam || null); 
    }, [activeTeam, setActiveTeam]); // S'executa quan activeTeam (de useUser) canvia

    useEffect(() => {
        setIsNavigating(false);
        const prefix = `/${locale}`;
        const pathnameWithoutLocale = pathname.startsWith(prefix) ? pathname.slice(prefix.length) || '/' : pathname;
        
        const currentModule = navModules.find(
            module => !module.isSingle && module.basePath && pathnameWithoutLocale.startsWith(module.basePath)
        );
        
        setActiveModule(currentModule || null);
        if (!currentModule) {
            setIsModuleSidebarOpen(false);
        }
    }, [pathname, locale, setIsNavigating]);
    
    
    // ✅ CORRECCIÓ 1: La funció 't' no canvia durant el cicle de vida del component,
    // per la qual cosa no cal incloure-la a l'array de dependències de 'useCallback'.
    const checkPlanPermission = useCallback((item: NavItem) => {
        const plan = user?.app_metadata?.active_team_plan as string | undefined;
        
        if (item.requiredPlan && item.requiredPlan.length > 0) {
            if (!plan || !item.requiredPlan.includes(plan.toLowerCase())) {
                // ✅ CORRECCIÓ: Obtenim la traducció fora del 'toast'
                const translatedLabel = t(item.labelKey);
                
                toast.info("Funcionalitat Premium", {
                    description: `El mòdul '${translatedLabel}' només està disponible als plans ${item.requiredPlan.join(' o ')}.`,
                    action: {
                        label: "Veure Plans",
                        onClick: () => router.push(`/${locale}/settings/billing`),
                    },
                });
                return false;
            }
        }
        return true;
    }, [user, locale, router, t]); // ✅ Tornem a afegir 't' a les dependències

    // ✅ CORRECCIÓ 2: Simplifiquem aquesta funció.
    // La comprovació de permisos ja es fa a 'handleMainMenuClick' o al 'SocialPlannerPage'.
    // Aquesta funció només s'ha d'encarregar de navegar.
    const handleNavigation = useCallback((item: NavItem) => {
        if (item.allowedRoles && (!teamRole || !item.allowedRoles.includes(teamRole))) {
            toast.error("Accés restringit", { description: "No tens els permisos necessaris per a accedir a aquesta secció." });
            return;
        }

        const targetPath = `/${locale}${item.path}`;
        if (pathname !== targetPath) {
            setIsNavigating(true);
            router.push(targetPath);
        }

        if (activeModule?.children?.some(child => child.id === item.id)) {
            setIsModuleSidebarOpen(false);
        }
    }, [teamRole, pathname, locale, router, setIsNavigating, activeModule]);

    const handleMainMenuClick = useCallback((item: NavItem) => {
        // ✅ CORRECCIÓ CLAU: Aquesta és la lògica que faltava.
        // Si l'ítem és un mòdul (isSingle: false), no fem la comprovació de pla aquí,
        // sinó que simplement obrim el submenú. La comprovació es farà quan es faci
        // clic a l'ítem del submenú (p. ex., 'Planificador') o a la pàgina de destí.
        
        if (item.isSingle) {
            // Si és un enllaç directe (com el Dashboard), comprovem el permís i naveguem.
            if (checkPlanPermission(item)) {
                handleNavigation(item);
            }
        } else {
            // Si és un mòdul amb fills (com Comunicació), només gestionem el submenú.
            if (activeModule?.id === item.id) {
                setIsModuleSidebarOpen(prev => !prev);
            } else {
                setActiveModule(item);
                setIsModuleSidebarOpen(true);
            }
        }
    }, [activeModule, handleNavigation, checkPlanPermission]);

    return {
        activeModule,
        isModuleSidebarOpen,
        setIsModuleSidebarOpen,
        handleNavigation,
        handleMainMenuClick,
    };
}