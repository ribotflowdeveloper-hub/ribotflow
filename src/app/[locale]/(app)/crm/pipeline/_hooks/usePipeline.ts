import { useState, useMemo, useTransition, useCallback } from 'react'; 
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type DropResult } from '@hello-pangea/dnd';
import { updateOpportunityStageAction } from '../actions.ts';
import type { Opportunity, Stage } from '../app/[locale]/(app)/crm/pipeline/page';

// ✅ El hook ara rep l'estat i la funció per modificar-lo
interface UsePipelineProps {
    initialStages: Stage[];
    opportunities: Opportunity[];
    setOpportunities: React.Dispatch<React.SetStateAction<Opportunity[]>>;
}

export function usePipeline({ initialStages, opportunities, setOpportunities }: UsePipelineProps) {
    const router = useRouter();
    const [isDndPending, startDndTransition] = useTransition();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Partial<Opportunity> | null>(null);
    const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');

  

    const opportunitiesByStage = useMemo(() => {
        const grouped = initialStages.reduce((acc, stage) => {
            acc[stage.name] = [];
            return acc;
        }, {} as Record<string, Opportunity[]>);

        opportunities.forEach(op => {
            if (grouped[op.stage_name]) {
                grouped[op.stage_name].push(op);
            }
        });
        Object.values(grouped).forEach(ops => ops.sort((a, b) => (a.value ?? 0) - (b.value ?? 0)));
        return grouped;
    }, [opportunities, initialStages]);

    const onDragEnd = useCallback((result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

        const newStage = destination.droppableId;
        const originalOpportunities = [...opportunities];

        // 1. Actualització Optimista
        setOpportunities(prev => prev.map(op => 
            op.id.toString() === draggableId ? { ...op, stage_name: newStage } : op
        ));

        startDndTransition(async () => {
            const updateResult = await updateOpportunityStageAction(draggableId, newStage);
            if (updateResult.error) {
                setOpportunities(originalOpportunities); // Revertim si falla
                toast.error("Error", { description: updateResult.error.message });
            } else {
                toast.success("Oportunitat moguda amb èxit.");
                // router.refresh() ja no és estrictament necessari aquí
                // perquè el useEffect del component pare ja sincronitzarà les dades.
                // Però el podem deixar per forçar la consistència.
                router.refresh();
            }
        });
    }, [opportunities, setOpportunities, router]);

    const handleOpenDialog = useCallback((opportunity?: Opportunity, stageName?: string) => {
        if (opportunity) {
            setEditingOpportunity(opportunity);
        } else {
            setEditingOpportunity(stageName ? { stage_name: stageName } : {});
        }
        setIsDialogOpen(true);
    }, []);

    const handleSuccess = useCallback(() => {
        setIsDialogOpen(false);
        router.refresh();
    }, [router]);

    return {
        isPending: isDndPending,
        opportunitiesByStage,
        viewMode,
        setViewMode,
        isDialogOpen,
        setIsDialogOpen,
        editingOpportunity,
        onDragEnd,
        handleOpenDialog,
        handleSuccess,
    };
}