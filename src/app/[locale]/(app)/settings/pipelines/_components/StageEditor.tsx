"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2, GripVertical, Edit, Check, X, Trash2, Award, Frown, Inbox, Send, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type PipelineWithStages } from './SettingsPipelinesData';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult
} from '@hello-pangea/dnd';

type Stage = PipelineWithStages['pipeline_stages'][0];

interface StageEditorProps {
  isPending: boolean;
  activePipeline: PipelineWithStages | undefined;
  semanticStageIds: {
    won: string | undefined;
    lost: string | undefined;
    proposal: string | undefined;
    contacted: string | undefined;
    prospect: string | undefined;
  };
  editingStageId: number | null;
  editingStageName: string;
  newStageName: string;
  newStageColor: string;
  
  onSetStageType: (stageId: string, stageType: 'WON' | 'LOST' | 'PROSPECT' | 'CONTACTED' | 'PROPOSAL') => void;
  onDragEndStages: (result: DropResult) => void;
  onEditStage: (stage: Stage) => void;
  onSaveStageName: (id: number) => void;
  onCancelEdit: () => void;
  onDeleteStage: (stage: Stage) => void;
  
  setEditingStageName: (name: string) => void;
  setNewStageName: (name: string) => void;
  setNewStageColor: (color: string) => void;
  onCreateStage: (e: React.FormEvent) => void;
}

export function StageEditor({
  isPending,
  activePipeline,
  semanticStageIds,
  editingStageId,
  editingStageName,
  newStageName,
  newStageColor,
  onSetStageType,
  onDragEndStages,
  onEditStage,
  onSaveStageName,
  onCancelEdit,
  onDeleteStage,
  setEditingStageName,
  setNewStageName,
  setNewStageColor,
  onCreateStage,
}: StageEditorProps) {
  const t = useTranslations('SettingsPage.SettingsPipelines');

  if (!activePipeline) {
    return (
      <div className="md:col-span-2 p-4 bg-card border rounded-lg shadow-sm">
        <p>{t('selectPipelinePrompt')}</p>
      </div>
    );
  }

  return (
    <div className="md:col-span-2 p-4 bg-card border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">{t('stagesFor')} "{activePipeline.name}"</h2>
      
      {/* --- Selectors de Flux --- */}
      <div className="p-4 border rounded-lg bg-muted/50 mb-4">
        <h3 className="text-lg font-semibold mb-4">{t('automationFlows')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <StageTypeSelector
            label={t('prospectStageLabel')}
            icon={<Inbox className="h-4 w-4 text-blue-500" />}
            htmlFor="prospect-stage"
            value={semanticStageIds.prospect}
            onValueChange={(stageId) => onSetStageType(stageId, 'PROSPECT')}
            stages={activePipeline.pipeline_stages}
            isPending={isPending}
          />

          <StageTypeSelector
            label={t('contactedStageLabel')}
            icon={<Send className="h-4 w-4 text-cyan-500" />}
            htmlFor="contacted-stage"
            value={semanticStageIds.contacted}
            onValueChange={(stageId) => onSetStageType(stageId, 'CONTACTED')}
            stages={activePipeline.pipeline_stages}
            isPending={isPending}
          />

          <StageTypeSelector
            label={t('proposalStageLabel')}
            icon={<FileText className="h-4 w-4 text-purple-500" />}
            htmlFor="proposal-stage"
            value={semanticStageIds.proposal}
            onValueChange={(stageId) => onSetStageType(stageId, 'PROPOSAL')}
            stages={activePipeline.pipeline_stages}
            isPending={isPending}
          />
          
          <StageTypeSelector
            label={t('wonStageLabel')}
            icon={<Award className="h-4 w-4 text-green-600" />}
            htmlFor="won-stage"
            value={semanticStageIds.won}
            onValueChange={(stageId) => onSetStageType(stageId, 'WON')}
            stages={activePipeline.pipeline_stages}
            isPending={isPending}
            className="font-semibold text-green-600"
          />

          <StageTypeSelector
            label={t('lostStageLabel')}
            icon={<Frown className="h-4 w-4 text-red-600" />}
            htmlFor="lost-stage"
            value={semanticStageIds.lost}
            onValueChange={(stageId) => onSetStageType(stageId, 'LOST')}
            stages={activePipeline.pipeline_stages}
            isPending={isPending}
            className="font-semibold text-red-600"
          />

        </div>
      </div>
      {/* --- Fi dels Selectors de Flux --- */}
      
      <h3 className="text-lg font-semibold mb-4">{t('pipelineStages')}</h3>
      <DragDropContext onDragEnd={onDragEndStages}>
        <Droppable droppableId={`stages-${activePipeline.id}`}>
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="space-y-2 mb-4"
            >
              {activePipeline.pipeline_stages.map((stage, index) => (
                <Draggable key={stage.id} draggableId={stage.id.toString()} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center gap-2 p-3 bg-muted rounded-md border-l-4"
                      style={{ borderLeftColor: stage.color || '#808080' }}
                    >
                      <span {...provided.dragHandleProps}>
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                      </span>
                      {editingStageId === stage.id ? (
                        <>
                          <Input
                            value={editingStageName}
                            onChange={(e) => setEditingStageName(e.target.value)}
                            className="flex-1"
                            disabled={isPending}
                          />
                          <Button variant="ghost" size="icon" onClick={() => onSaveStageName(stage.id)} disabled={isPending}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={onCancelEdit} disabled={isPending}>
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 font-medium">{stage.name}</span>
                          <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => onEditStage(stage)} disabled={isPending}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => onDeleteStage(stage)} disabled={isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      
      <form onSubmit={onCreateStage} className="flex gap-2">
        <Input
          placeholder={t('newStageName')}
          value={newStageName}
          onChange={(e) => setNewStageName(e.target.value)}
          disabled={isPending}
          className="flex-1"
        />
        <input
          type="color"
          value={newStageColor}
          onChange={(e) => setNewStageColor(e.target.value)}
          disabled={isPending}
          className="w-10 h-10 p-1 border-0 rounded-md bg-transparent cursor-pointer"
          title={t('selectColor')}
        />
        <Button type="submit" size="icon" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        </Button>
      </form>
    </div>
  );
}

// Component intern per no repetir la lògica del Selector
function StageTypeSelector({ label, icon, htmlFor, value, onValueChange, stages, isPending, className }: {
  label: string;
  icon: React.ReactNode;
  htmlFor: string;
  value: string | undefined;
  onValueChange: (value: string) => void;
  stages: Stage[];
  isPending: boolean;
  className?: string;
}) {
  const t = useTranslations('SettingsPage.SettingsPipelines');
  return (
    <div>
      <Label htmlFor={htmlFor} className={`flex items-center gap-2 mb-2 text-sm ${className}`}>
        {icon}
        {label}
      </Label>
      <Select
        value={value}
        onValueChange={onValueChange}
        disabled={isPending}
      >
        <SelectTrigger id={htmlFor}>
          <SelectValue placeholder={t('selectStage')} />
        </SelectTrigger>
        <SelectContent>
          {stages.map(stage => (
            <SelectItem key={stage.id} value={stage.id.toString()}>
              {stage.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}