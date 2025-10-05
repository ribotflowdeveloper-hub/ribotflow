import { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type DropResult } from '@hello-pangea/dnd';
import { updateOpportunityStageAction } from '../actions.ts';
import type { Opportunity, Stage } from '../app/[locale]/(app)/crm/pipeline/page';

export function usePipeline(initialOpportunities: Opportunity[], initialStages: Stage[]) {
    const router = useRouter();
    const [isDndPending, startDndTransition] = useTransition();
    
    const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Partial<Opportunity> | null>(null);
    const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');
    
    useEffect(() => {
        setOpportunities(initialOpportunities);
    }, [initialOpportunities]);

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
        // Ordenació opcional
        Object.values(grouped).forEach(ops => ops.sort((a, b) => (a.value ?? 0) - (b.value ?? 0)));
        return grouped;
    }, [opportunities, initialStages]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) return;

        const newStage = destination.droppableId;
        const originalOpportunities = [...opportunities];

        setOpportunities(prev => prev.map(op => op.id === draggableId ? { ...op, stage_name: newStage } : op));

        startDndTransition(async () => {
            const updateResult = await updateOpportunityStageAction(draggableId, newStage);
            if (updateResult.error) {
                setOpportunities(originalOpportunities);
                toast.error("Error", { description: updateResult.error.message });
            } else {
                toast.success("Oportunitat moguda amb èxit.");
            }
        });
    };

    const handleOpenDialog = (opportunity?: Opportunity, stageName?: string) => {
        if (opportunity) {
            setEditingOpportunity(opportunity);
        } else {
            setEditingOpportunity(stageName ? { stage_name: stageName } : {});
        }
        setIsDialogOpen(true);
    };

    const handleSuccess = () => router.refresh();

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