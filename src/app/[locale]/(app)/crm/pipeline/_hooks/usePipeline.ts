// /app/[locale]/(app)/crm/pipeline/_hooks/usePipeline.ts (Refactoritzat)

import { useState, useMemo, useTransition, useCallback } from 'react'; 
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type DropResult } from '@hello-pangea/dnd';
import { updateOpportunityStageAction } from '../actions';
// ✅ Importem els nous tipus.
import { type Stage, type OpportunityWithContact } from '../_components/PipelineData';

interface UsePipelineProps {
    initialStages: Stage[];
    opportunities: OpportunityWithContact[];
    setOpportunities: React.Dispatch<React.SetStateAction<OpportunityWithContact[]>>;
}

export function usePipeline({ initialStages, opportunities, setOpportunities }: UsePipelineProps) {
    const router = useRouter();
    const [isDndPending, startDndTransition] = useTransition();

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    // ✅ El tipus ara és el correcte, amb l'ID numèric.
    const [editingOpportunity, setEditingOpportunity] = useState<Partial<OpportunityWithContact> | null>(null);
    const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');

    const opportunitiesByStage = useMemo(() => {
        const grouped = initialStages.reduce((acc, stage) => {
            acc[stage.name] = [];
            return acc;
        }, {} as Record<string, OpportunityWithContact[]>);

        opportunities.forEach(op => {
            if (op.stage_name && grouped[op.stage_name]) {
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
        const opportunityId = parseInt(draggableId, 10);
        const originalOpportunities = [...opportunities];

        setOpportunities(prev => prev.map(op => 
            op.id === opportunityId ? { ...op, stage_name: newStage } : op
        ));

        startDndTransition(async () => {
            // ✅ Passem l'ID com a número.
            const updateResult = await updateOpportunityStageAction(opportunityId, newStage);
            if (updateResult.error) {
                setOpportunities(originalOpportunities);
                toast.error("Error", { description: updateResult.error.message });
            } else {
                toast.success("Oportunitat moguda amb èxit.");
                router.refresh();
            }
        });
    }, [opportunities, setOpportunities, router]);

    const handleOpenDialog = useCallback((opportunity?: OpportunityWithContact, stageName?: string) => {
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