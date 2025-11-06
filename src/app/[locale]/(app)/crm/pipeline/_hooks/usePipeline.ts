import { useState, useMemo, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type DropResult } from '@hello-pangea/dnd';
import { updateOpportunityStageAction } from '../actions';
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
  const [editingOpportunity, setEditingOpportunity] = useState<Partial<OpportunityWithContact> | null>(null);
  const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');

  const opportunitiesByStage = useMemo(() => {
    // ✅ CORRECCIÓ: Agrupem per 'pipeline_stage_id' (número)
    const grouped = initialStages.reduce((acc, stage) => {
      // La clau de l'objecte és l'ID de l'etapa
      acc[stage.id] = [];
      return acc;
    }, {} as Record<number, OpportunityWithContact[]>);

    opportunities.forEach(op => {
      // Comprovem si l'ID de l'etapa de l'oportunitat existeix al nostre grup
      if (op.pipeline_stage_id && grouped[op.pipeline_stage_id]) {
        grouped[op.pipeline_stage_id].push(op);
      }
    });
    
    // Ordenem per valor
    Object.values(grouped).forEach(ops => ops.sort((a, b) => (a.value ?? 0) - (b.value ?? 0)));
    return grouped;
  }, [opportunities, initialStages]);

  const onDragEnd = useCallback((result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
      return;
    }

    // ✅ CORRECCIÓ: Tots els IDs són números
    const newStageId = parseInt(destination.droppableId, 10);
    const opportunityId = parseInt(draggableId, 10);
    const originalOpportunities = [...opportunities];

    // Actualització optimista (UI)
    setOpportunities(prev => prev.map(op =>
      op.id === opportunityId ? { ...op, pipeline_stage_id: newStageId } : op
    ));

    startDndTransition(async () => {
      // Cridem a la Server Action amb els IDs numèrics
      const updateResult = await updateOpportunityStageAction(opportunityId, newStageId);
      
      if (updateResult.error) {
        setOpportunities(originalOpportunities); // Revertim en cas d'error
        toast.error("Error", { description: updateResult.error.message });
      } else {
        toast.success("Oportunitat moguda amb èxit.");
        router.refresh(); // Sincronitzem amb el servidor
      }
    });
  }, [opportunities, setOpportunities, router]);

  const handleOpenDialog = useCallback((
    opportunity?: OpportunityWithContact, 
    // ✅ CORRECCIÓ: Rebem l'ID de l'etapa, no el nom
    stageId?: number 
  ) => {
    if (opportunity) {
      setEditingOpportunity(opportunity);
    } else {
      // ✅ CORRECCIÓ: Assignem el 'pipeline_stage_id'
      setEditingOpportunity(stageId ? { pipeline_stage_id: stageId } : {});
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