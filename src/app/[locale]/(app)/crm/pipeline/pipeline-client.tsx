"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { Plus, LayoutGrid, Rows, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useRouter, usePathname } from 'next/navigation';

// ✅ Imports de Tipus i Components
import { type Database } from '@/types/supabase';
import type { Pipeline } from '@/types/db'; 
import { type Stage, type OpportunityWithContact } from './_components/PipelineData';
import { usePipeline } from './_hooks/usePipeline';
import { OpportunityDialog } from './_components/OpportunityDialog';
import { ColumnsView } from './_components/ColumnsView';
import { RowsView } from './_components/RowsView';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// ✅ AFEGIT: Importem el Separator
import { Separator } from '@/components/ui/separator'; 

type FullContact = Database['public']['Tables']['contacts']['Row'];

interface PipelineClientProps {
  initialPipelines: Pipeline[]; 
  activePipelineId: number | null; 
  initialStages: Stage[];
  initialContacts: FullContact[];
  initialOpportunities: OpportunityWithContact[];
}

export function PipelineClient({
  initialPipelines,
  activePipelineId,
  initialStages,
  initialContacts,
  initialOpportunities
}: PipelineClientProps) {

  const t = useTranslations('PipelinePage');
  const tSettings = useTranslations('SettingsPage.SettingsPipelines'); // Per al nou botó
  const router = useRouter();
  const pathname = usePathname();

  const [opportunities, setOpportunities] = useState(initialOpportunities);

  useEffect(() => {
    setOpportunities(initialOpportunities);
  }, [initialOpportunities]);

  const {
    isPending,
    opportunitiesByStage,
    viewMode,
    setViewMode,
    isDialogOpen,
    setIsDialogOpen,
    editingOpportunity,
    onDragEnd,
    handleOpenDialog,
    handleSuccess,
  } = usePipeline({
    initialStages,
    opportunities,
    setOpportunities
  });

  const isMobile = useMediaQuery("(max-width: 767px)");
  const effectiveViewMode = isMobile ? 'rows' : viewMode;

  const handlePipelineChange = (pipelineId: string) => {
    // Si l'usuari clica "crear nou", el 'onSelect' de l'item ho gestionarà abans
    if (pipelineId === '--create-new--') return;
    router.push(`${pathname}?pipeline=${pipelineId}`);
  };

  const activePipelineName = initialPipelines.find(p => p.id === activePipelineId)?.name || t('selectPipeline');

  return (
    <>
      <OpportunityDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contacts={initialContacts}
        stages={initialStages}
        onSuccess={handleSuccess}
        opportunityToEdit={editingOpportunity}
      />
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">

          <div className="flex-1 min-w-0">
            {initialPipelines.length > 0 && activePipelineId ? (
              <Select onValueChange={handlePipelineChange} defaultValue={activePipelineId.toString()}>
                <SelectTrigger className="w-auto max-w-xs md:w-[280px] bg-background text-lg md:text-3xl font-bold h-auto p-0 border-0 shadow-none data-[state=open]:ring-0 focus:ring-0">
                  <SelectValue asChild>
                    <span className="truncate">{activePipelineName}</span>
                  </SelectValue>
                </SelectTrigger>
                
                {/* ✅ CONTINGUT DEL SELECTOR ACTUALITZAT */}
                <SelectContent>
                  {initialPipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id.toString()}>
                      {pipeline.name}
                    </SelectItem>
                  ))}
                  
                  {/* --- AFEGIT: Botó per anar a la configuració --- */}
                  <Separator className="my-1" />
                  <SelectItem
                    value="--create-new--" // Un valor dummy
                    className="text-primary focus:text-primary"
                    // Aquest 'onSelect' s'activa abans que 'onValueChange'
                    onSelect={(e) => {
                      e.preventDefault(); // Evitem que el select es tanqui o canviï de valor
                      router.push('/settings/pipelines'); // Naveguem a la pàgina
                    }}
                  >
                    <div className="flex items-center">
                      <Plus className="mr-2 h-4 w-4" />
                      {tSettings('managePipelines')}
                    </div>
                  </SelectItem>
                  {/* --- FI DE L'AFEGIT --- */}

                </SelectContent>
              </Select>
            ) : (
              <h1 className="text-3xl font-bold truncate">{activePipelineName || t('title')}</h1>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-lg hidden md:flex">
              <Button variant={viewMode === 'columns' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('columns')} aria-label={t('columnViewLabel')} disabled={isPending}><LayoutGrid className="w-4 h-4" /></Button>
              <Button variant={viewMode === 'rows' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('rows')} aria-label={t('rowViewLabel')} disabled={isPending}><Rows className="w-4 h-4" /></Button>
            </div>

            <Button onClick={() => handleOpenDialog()} disabled={isPending}>
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              {t('addOpportunity')}
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          {effectiveViewMode === 'columns' ? (
            <ColumnsView
              stages={initialStages}
              opportunitiesByStage={opportunitiesByStage}
              onEditOpportunity={(op) => handleOpenDialog(op)}
              onAddClick={(stageId) => handleOpenDialog(undefined, stageId)}
            />
          ) : (
            <RowsView
              stages={initialStages}
              opportunitiesByStage={opportunitiesByStage}
              onEditOpportunity={(op) => handleOpenDialog(op)}
              onAddClick={(stageId) => handleOpenDialog(undefined, stageId)}
            />
          )}
        </DragDropContext>
      </motion.div>
    </>
  );
}