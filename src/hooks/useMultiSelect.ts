// src/hooks/useMultiSelect.ts
import { useState, useCallback, useTransition } from 'react';
import { toast } from 'sonner';
import { type ActionResult } from '@/types/shared/actionResult';

interface UseMultiSelectProps<TData extends { id: string | number }> {
    /** Llista de dades actuals a la pàgina (per a Select All) */
    data: TData[];
    /** Server Action per eliminar múltiples items */
    bulkDeleteAction: (ids: (string | number)[]) => Promise<ActionResult>;
    /** Missatges per a les notificacions */
    toastMessages?: {
        bulkDeleteSuccess?: string;
        bulkDeleteError?: string;
    };
    /** Funció opcional per executar després de l'eliminació massiva (p.ex., forçar un refetch) */
    onDeleteSuccess: () => void;
}

/**
 * Hook genèric per gestionar la selecció múltiple i l'eliminació massiva en taules.
 */
export function useMultiSelect<TData extends { id: string | number }>({
    data,
    bulkDeleteAction,
    toastMessages,
    onDeleteSuccess,
}: UseMultiSelectProps<TData>) {
    // Estats de selecció i eliminació
    const [isMultiSelectActive, setIsMultiSelectActive] = useState(false);
    const [selectedItems, setSelectedItems] = useState<(string | number)[]>([]);
    const [isBulkDeletePending, startBulkDeleteTransition] = useTransition();

    // 1. Funció per activar/desactivar el mode de selecció
    const onToggleMultiSelect = useCallback(() => {
        setIsMultiSelectActive(prev => {
            if (prev) {
                setSelectedItems([]);
            }
            return !prev;
        });
    }, []);

    // 2. Selecciona/desselecciona tots els ítems de la pàgina actual
    const onSelectAll = useCallback((checked: boolean) => {
        if (checked) {
            // Només seleccionem els IDs dels ítems actualment visibles
            setSelectedItems(data.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    }, [data]);

    // 3. Selecciona/desselecciona un ítem individual
    const onSelectItem = useCallback((id: string | number, checked: boolean) => {
        setSelectedItems(prev => {
            if (checked) {
                return prev.includes(id) ? prev : [...prev, id];
            } else {
                return prev.filter(itemId => itemId !== id);
            }
        });
    }, []);
    
    // 4. Handler per l'eliminació massiva (cridat per l'AlertDialog)
    const handleBulkDelete = useCallback(async () => {
        if (selectedItems.length === 0) return;
        
        startBulkDeleteTransition(async () => {
            const result = await bulkDeleteAction(selectedItems); 
            
            if (result.success) {
                // Notificació d'èxit
                toast.success(toastMessages?.bulkDeleteSuccess || result.message || `${selectedItems.length} ítems eliminats.`);
                
                // Neteja d'estat
                setSelectedItems([]);
                setIsMultiSelectActive(false); 
                onDeleteSuccess(); // Forcem recàrrega de usePaginatedResource (per obtenir el nou count/dades)
            } else {
                // Notificació d'error
                toast.error(toastMessages?.bulkDeleteError || result.message || "Error en l'eliminació massiva.");
            }
        });
    }, [selectedItems, bulkDeleteAction, toastMessages, onDeleteSuccess]);

    // 5. Funció per netejar la selecció des de fora (cridat des de useEffect de InvoicesClient)
    const clearSelection = useCallback(() => {
        setSelectedItems([]);
    }, []);

    return {
        isMultiSelectActive,
        selectedItems,
        isBulkDeletePending,
        onToggleMultiSelect,
        onSelectAll,
        onSelectItem,
        handleBulkDelete,
        clearSelection,
    };
}