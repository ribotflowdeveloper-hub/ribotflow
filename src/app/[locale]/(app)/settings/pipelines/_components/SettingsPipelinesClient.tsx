"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { type PipelineWithStages } from './SettingsPipelinesData';
import { usePipelineManager } from '../_hooks/usePipelineManager';
import { PipelineManagerDialogs } from './PipelineManagerDialogs';
import { PipelineList } from './PipelineList';
import { StageEditor } from './StageEditor';

interface SettingsPipelinesClientProps {
  initialData: PipelineWithStages[];
}

export function SettingsPipelinesClient({ initialData }: SettingsPipelinesClientProps) {
  const t = useTranslations('SettingsPage.SettingsPipelines');
  
  // Tot l'estat i la lògica estan ara dins d'aquest hook
  const {
    isPending,
    pipelines,
    activePipeline,
    semanticStageIds,
    selectedPipelineId,
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
    deletingStage,
  } = usePipelineManager(initialData);

  return (
    <>
      <PipelineManagerDialogs
        isPending={isPending}
        deletingPipeline={deletingPipeline}
        setDeletingPipeline={setDeletingPipeline}
        handleConfirmDeletePipeline={handleConfirmDeletePipeline}
        deletingStage={deletingStage}
        setDeletingStage={setDeletingStage}
        handleConfirmDeleteStage={handleConfirmDeleteStage}
      />

      <div className="p-6">
        <h1 className="text-3xl font-bold mb-6">{t('title')}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <PipelineList
            isPending={isPending}
            pipelines={pipelines}
            selectedPipelineId={selectedPipelineId}
            editingPipelineId={editingPipelineId}
            editingPipelineName={editingPipelineName}
            newPipelineName={newPipelineName}
            onSelectPipeline={setSelectedPipelineId}
            onEditPipeline={handleEditPipeline}
            onSavePipelineName={handleSavePipelineName}
            onCancelEdit={() => setEditingPipelineId(null)}
            onDeletePipeline={setDeletingPipeline}
            setEditingPipelineName={setEditingPipelineName}
            setNewPipelineName={setNewPipelineName}
            onCreatePipeline={handleCreatePipeline}
          />

          <StageEditor
            isPending={isPending}
            activePipeline={activePipeline}
            semanticStageIds={semanticStageIds}
            editingStageId={editingStageId}
            editingStageName={editingStageName}
            newStageName={newStageName}
            newStageColor={newStageColor}
            onSetStageType={handleSetStageType}
            onDragEndStages={onDragEndStages}
            onEditStage={handleEditStage}
            onSaveStageName={handleSaveStageName}
            onCancelEdit={() => setEditingStageId(null)}
            onDeleteStage={setDeletingStage}
            setEditingStageName={setEditingStageName}
            setNewStageName={setNewStageName}
            setNewStageColor={setNewStageColor}
            onCreateStage={handleCreateStage}
          />
        </div>
      </div>
    </>
  );
}