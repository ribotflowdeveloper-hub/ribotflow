// @/hooks/useContactFilters.ts
"use client";

import { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type ViewMode = 'cards' | 'list';
type FilterType = 'sort' | 'status' | 'view';

/**
 * Hook personalitzat per gestionar els filtres de la pàgina de contactes.
 * Encapsula la lògica per llegir i escriure a la URL (search params),
 * gestionant l'estat de càrrega i les actualitzacions optimistes de la UI.
 * @param initialViewMode - El mode de vista per defecte ('cards' o 'list').
 */
export function useContactFilters(initialViewMode: ViewMode) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [isPending, startTransition] = useTransition();

    // Llegeix els valors actuals de la URL o estableix valors per defecte.
    const sortBy = searchParams.get('sort') || 'newest';
    const statusFilter = searchParams.get('status') || 'all';

    // Utilitzem un estat local per al 'viewMode' per tenir una resposta
    // visual immediata, abans que la URL s'actualitzi.
    const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

    /**
     * Actualitza un paràmetre de la URL i navega a la nova ruta.
     * @param type - El tipus de filtre a canviar ('sort', 'status', 'view').
     * @param value - El nou valor per al filtre.
     */
    const handleFilterChange = (type: FilterType, value: string) => {
        const current = new URLSearchParams(Array.from(searchParams.entries()));
        current.set(type, value);

        // Si el filtre no és un canvi de vista, reiniciem a la primera pàgina.
        if (type !== 'view') {
            current.set('page', '1');
        }

        const search = current.toString();
        const query = search ? `?${search}` : "";

        // Actualització optimista per a una millor experiència d'usuari.
        if (type === 'view') {
            setViewMode(value as ViewMode);
        }
        
        // Utilitzem startTransition per evitar bloquejar la UI durant la navegació.
        startTransition(() => {
            router.push(`${pathname}${query}`);
        });
    };

    return {
        isPending,
        sortBy,
        statusFilter,
        viewMode,
        handleFilterChange,
    };
}