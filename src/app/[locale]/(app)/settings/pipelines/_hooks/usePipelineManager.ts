"use client";

import { useState, useMemo, useTransition } from 'react';
import { type DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { type PipelineWithStages } from '../_components/SettingsPipelinesData';
import {
  createPipelineAction,
  updatePipelineNameAction,
  deletePipelineAction,
  createStageAction,
  updateStageNameAction,
  deleteStageAction,
  updateStagesOrderAction,
  setStageTypeAction,
} from '../actions';

type Stage = PipelineWithStages['pipeline_stages'][0];

export function usePipelineManager(initialData: PipelineWithStages[]) {
  const t = useTranslations('SettingsPage.SettingsPipelines');
  const [isPending, startTransition] = useTransition();

  // --- Estats Principals ---
  const [pipelines, setPipelines] = useState(initialData);
  const [selectedPipelineId, setSelectedPipelineId] = useState<number | null>(
    initialData[0]?.id || null
  );

  // --- Estats de Formularis ---
  const [newPipelineName, setNewPipelineName] = useState("");
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#808080");

  // --- Estats d'Edició ---
  const [editingPipelineId, setEditingPipelineId] = useState<number | null>(null);
  const [editingPipelineName, setEditingPipelineName] = useState("");
  const [editingStageId, setEditingStageId] = useState<number | null>(null);
  const [editingStageName, setEditingStageName] = useState("");

  // --- Estats de Diàlegs ---
  const [deletingPipeline, setDeletingPipeline] = useState<PipelineWithStages | null>(null);
  const [deletingStage, setDeletingStage] = useState<Stage | null>(null);

  // --- Dades Derivades (Memoized) ---
  const activePipeline = useMemo(() => {
    return pipelines.find(p => p.id === selectedPipelineId);
  }, [pipelines, selectedPipelineId]);

  const semanticStageIds = useMemo(() => {
    const stages = activePipeline?.pipeline_stages || [];
    const findId = (type: string) => stages.find(s => s.stage_type === type)?.id.toString();
    return {
      won: findId('WON'),
      lost: findId('LOST'),
      proposal: findId('PROPOSAL'),
      contacted: findId('CONTACTED'),
      prospect: findId('PROSPECT')
    }
  }, [activePipeline]);

  // --- Gestors de Pipelines ---
  
  const handleCreatePipeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPipelineName.trim()) return;

    startTransition(async () => {
      const result = await createPipelineAction(newPipelineName.trim());
      if (result.error) {
        toast.error(t('errorCreatingPipeline'), { description: result.error.message });
      } else {
        toast.success(t('pipelineCreated'));
        setPipelines(prev => [...prev, { ...result.data, pipeline_stages: [] }]);
        setNewPipelineName("");
        setSelectedPipelineId(result.data.id);
      }
    });
  };

  const handleEditPipeline = (pipeline: PipelineWithStages) => {
    setEditingPipelineId(pipeline.id);
    setEditingPipelineName(pipeline.name);
  };

  const handleSavePipelineName = (pipelineId: number) => {
    if (!editingPipelineName.trim()) return;

    const originalPipelines = [...pipelines];
    setPipelines(prev => prev.map(p => 
      p.id === pipelineId ? { ...p, name: editingPipelineName } : p
    ));
    setEditingPipelineId(null);
    
    startTransition(async () => {
      const result = await updatePipelineNameAction(pipelineId, editingPipelineName);
      if (result.error) {
        toast.error(t('errorUpdatingPipeline'), { description: result.error.message });
        setPipelines(originalPipelines);
      } else {
        toast.success(t('pipelineUpdated'));
      }
    });
  };

  const handleConfirmDeletePipeline = () => {
    if (!deletingPipeline) return;
    
    const originalPipelines = [...pipelines];
    const pipelineIdToDelete = deletingPipeline.id;
    
    setPipelines(prev => prev.filter(p => p.id !== pipelineIdToDelete));
    if (selectedPipelineId === pipelineIdToDelete) {
        setSelectedPipelineId(originalPipelines[0]?.id || null);
    }
    setDeletingPipeline(null);

    startTransition(async () => {
      const result = await deletePipelineAction(pipelineIdToDelete);
      if (result.error) {
        toast.error(t('errorDeletingPipeline'), { description: result.error.message });
        setPipelines(originalPipelines);
      } else {
        toast.success(t('pipelineDeleted'));
      }
    });
  };

  // --- Gestors d'Etapes (Flux) ---

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStageName.trim() || !activePipeline) return;

    startTransition(async () => {
      const result = await createStageAction(activePipeline.id, newStageName.trim(), newStageColor);
      if (result.error) {
        toast.error(t('errorCreatingStage'), { description: result.error.message });
      } else {
        toast.success(t('stageCreated'));
        setPipelines(prev => prev.map(p =>
          p.id === activePipeline.id
            ? { ...p, pipeline_stages: [...p.pipeline_stages, result.data] }
            : p
        ));
        setNewStageName("");
        setNewStageColor("#808080");
      }
    });
  };
  
  const handleEditStage = (stage: Stage) => {
    setEditingStageId(stage.id);
    setEditingStageName(stage.name);
  };

  const handleSaveStageName = (stageId: number) => {
    if (!editingStageName.trim() || !activePipeline) return;

    const originalPipelines = [...pipelines];
    setPipelines(prev => prev.map(p =>
      p.id === activePipeline.id
        ? { ...p, pipeline_stages: p.pipeline_stages.map(s => 
            s.id === stageId ? { ...s, name: editingStageName } : s
          )}
        : p
    ));
    setEditingStageId(null);
    
    startTransition(async () => {
      const result = await updateStageNameAction(stageId, editingStageName);
      if (result.error) {
        toast.error(t('errorUpdatingStage'), { description: result.error.message });
        setPipelines(originalPipelines);
      } else {
        toast.success(t('stageUpdated'));
      }
    });
  };
  
  const handleConfirmDeleteStage = () => {
    if (!deletingStage || !activePipeline) return;

    const originalPipelines = [...pipelines];
    const stageIdToDelete = deletingStage.id;
    
    setPipelines(prev => prev.map(p =>
      p.id === activePipeline.id
        ? { ...p, pipeline_stages: p.pipeline_stages.filter(s => s.id !== stageIdToDelete) }
        : p
    ));
    setDeletingStage(null);

    startTransition(async () => {
      const result = await deleteStageAction(stageIdToDelete);
      if (result.error) {
        toast.error(t('errorDeletingStage'), { description: result.error.message });
        setPipelines(originalPipelines);
      } else {
        toast.success(t('stageDeleted'));
      }
    });
  };

  const onDragEndStages = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || !activePipeline || destination.index === source.index) {
      return;
    }

    const currentStages = Array.from(activePipeline.pipeline_stages);
    const [reorderedItem] = currentStages.splice(source.index, 1);
    currentStages.splice(destination.index, 0, reorderedItem);
    
    const originalPipelines = [...pipelines];
    setPipelines(prev => prev.map(p =>
      p.id === activePipeline.id
        ? { ...p, pipeline_stages: currentStages }
        : p
    ));

    const stagesToUpdate = currentStages.map((stage, index) => ({
      id: stage.id,
      position: index + 1
    }));
    
    startTransition(async () => {
      const updateResult = await updateStagesOrderAction(stagesToUpdate);
       if (updateResult.error) {
        toast.error(t('errorReordering'), { description: updateResult.error.message });
        setPipelines(originalPipelines);
      } else {
        toast.success(t('orderUpdated'));
      }
    });
  };

  const handleSetStageType = (
    stageIdStr: string, 
    stageType: 'WON' | 'LOST' | 'PROSPECT' | 'CONTACTED' | 'PROPOSAL'
  ) => {
    if (!activePipeline) return;
    const stageId = parseInt(stageIdStr, 10);

    const originalPipelines = [...pipelines];
    setPipelines(prev => prev.map(p => 
      p.id === activePipeline.id 
        ? { ...p, pipeline_stages: p.pipeline_stages.map(s => {
            if (s.stage_type === stageType) return { ...s, stage_type: null };
            if (s.id === stageId) return { ...s, stage_type: stageType };
            return s;
          })}
        : p
    ));

    startTransition(async () => {
      const result = await setStageTypeAction(activePipeline.id, stageId, stageType);
      if (result.error) {
        toast.error(t('errorSettingStageType'), { description: result.error.message });
        setPipelines(originalPipelines);
      } else {
        toast.success(t('stageTypeUpdated'));
      }
    });
  };

  return {
    isPending,
    // Estats
    pipelines,
    activePipeline,
    semanticStageIds,
    selectedPipelineId,
    // Gestors
    setSelectedPipelineId,
    // Gestors de Pipelines
    handleCreatePipeline,
    handleEditPipeline,
    handleSavePipelineName,
    setDeletingPipeline,
    handleConfirmDeletePipeline,
    // Gestors d'Etapes
    handleCreateStage,
    handleEditStage,
    handleSaveStageName,
    setDeletingStage,
    handleConfirmDeleteStage,
    // Gestors de DND i Flux
    onDragEndStages,
    handleSetStageType,
    // Estats de Formularis
    newPipelineName, setNewPipelineName,
    newStageName, setNewStageName,
    newStageColor, setNewStageColor,
    // Estats d'Edició
    editingPipelineId, setEditingPipelineId,
    editingPipelineName, setEditingPipelineName,
    editingStageId, setEditingStageId,
    editingStageName, setEditingStageName,
    // Estats de Diàlegs
    deletingPipeline,
    // ✅ CORRECCIÓ: Eliminada la propietat duplicada 'setDeletingPipeline'
    deletingStage,
  };
}