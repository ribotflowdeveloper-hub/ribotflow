"use client";

import React from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Loader2, Edit, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type PipelineWithStages } from './SettingsPipelinesData';

interface PipelineListProps {
  isPending: boolean;
  pipelines: PipelineWithStages[];
  selectedPipelineId: number | null;
  editingPipelineId: number | null;
  editingPipelineName: string;
  newPipelineName: string;
  onSelectPipeline: (id: number) => void;
  onEditPipeline: (pipeline: PipelineWithStages) => void;
  onSavePipelineName: (id: number) => void;
  onCancelEdit: () => void;
  onDeletePipeline: (pipeline: PipelineWithStages) => void;
  setEditingPipelineName: (name: string) => void;
  setNewPipelineName: (name: string) => void;
  onCreatePipeline: (e: React.FormEvent) => void;
}

export function PipelineList({
  isPending,
  pipelines,
  selectedPipelineId,
  editingPipelineId,
  editingPipelineName,
  newPipelineName,
  onSelectPipeline,
  onEditPipeline,
  onSavePipelineName,
  onCancelEdit,
  onDeletePipeline,
  setEditingPipelineName,
  setNewPipelineName,
  onCreatePipeline,
}: PipelineListProps) {
  const t = useTranslations('SettingsPage.SettingsPipelines');

  return (
    <div className="md:col-span-1 p-4 bg-card border rounded-lg shadow-sm">
      <h2 className="text-xl font-semibold mb-4">{t('pipelinesList')}</h2>
      
      <div className="space-y-2 mb-4">
        {pipelines.map(p => (
          <div key={p.id} className="flex items-center gap-2">
            {editingPipelineId === p.id ? (
              <>
                <Input
                  value={editingPipelineName}
                  onChange={(e) => setEditingPipelineName(e.target.value)}
                  className="flex-1"
                  disabled={isPending}
                />
                <Button variant="ghost" size="icon" onClick={() => onSavePipelineName(p.id)} disabled={isPending}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onCancelEdit} disabled={isPending}>
                  <X className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant={selectedPipelineId === p.id ? 'secondary' : 'ghost'}
                  className="flex-1 justify-start"
                  onClick={() => onSelectPipeline(p.id)}
                >
                  {p.name}
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground" onClick={() => onEditPipeline(p)} disabled={isPending}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-red-500" onClick={() => onDeletePipeline(p)} disabled={isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      
      <form onSubmit={onCreatePipeline} className="flex gap-2">
        <Input
          placeholder={t('newPipelineName')}
          value={newPipelineName}
          onChange={(e) => setNewPipelineName(e.target.value)}
          disabled={isPending}
        />
        <Button type="submit" size="icon" disabled={isPending}>
          {isPending ? <Loader2 className="animate-spin" /> : <Plus />}
        </Button>
      </form>
    </div>
  );
}