// Ubicació: /hooks/useAppNavigation.ts

import { useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useUser } from '@/hooks/useUser';
import { useNavigationStore } from '@/stores/navigationStore';
import { navModules } from '@/config/navigation';
import type { NavItem } from '@/types/navigation';

export function useAppNavigation() {
    const pathname = usePathname();
    const router = useRouter();
    const locale = useLocale();
    const t = useTranslations('Navigation');
    const { user, teamRole } = useUser();
    const { setIsNavigating } = useNavigationStore();

    const [activeModule, setActiveModule] = useState<NavItem | null>(null);
    const [isModuleSidebarOpen, setIsModuleSidebarOpen] = useState(false);

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

    const handleNavigation = useCallback((item: NavItem) => {
        const plan = user?.app_metadata?.active_team_plan;
        
        if (item.requiredPlan && !item.requiredPlan.includes(plan)) {
            toast.info("Funcionalitat Premium", {
                description: `El mòdul '${t(item.labelKey)}' només està disponible als plans ${item.requiredPlan.join(' o ')}.`,
                action: {
                    label: "Veure Plans",
                    onClick: () => router.push(`/${locale}/settings/billing`),
                },
            });
            return;
        }

        if (item.allowedRoles && (!teamRole || !item.allowedRoles.includes(teamRole))) {
            toast.error("Accés restringit", { description: "No tens els permisos necessaris per a accedir a aquesta secció." });
            return;
        }

        const targetPath = `/${locale}${item.path}`;
        if (pathname !== targetPath) {
            setIsNavigating(true);
            router.push(targetPath);
        }

        // En dispositius mòbils o si l'element és un fill, potser ja voldràs tancar el submenú
        // Aquesta lògica es pot ajustar segons el comportament desitjat
        if (activeModule?.children?.some(child => child.id === item.id)) {
             // Es podria mantenir obert, o tancar. De moment ho tanquem.
             setIsModuleSidebarOpen(false);
        }
    }, [user, teamRole, pathname, locale, router, setIsNavigating, t, activeModule]);

    const handleMainMenuClick = useCallback((item: NavItem) => {
        if (item.isSingle) {
            // Si és un enllaç directe (Dashboard, etc.), navega
            handleNavigation(item);
        } else {
            // Si és un mòdul amb submenú (CRM, Finances), gestiona la visibilitat del submenú
            if (activeModule?.id === item.id) {
                setIsModuleSidebarOpen(prev => !prev);
            } else {
                setActiveModule(item);
                setIsModuleSidebarOpen(true);
            }
        }
    }, [activeModule, handleNavigation]);

    return {
        activeModule,
        isModuleSidebarOpen,
        setIsModuleSidebarOpen,
        handleNavigation,
        handleMainMenuClick,
    };
}