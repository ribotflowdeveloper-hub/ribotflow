// Ruta del fitxer: src/app/(app)/crm/pipeline/_components/PipelineClient.tsx
"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useToast } from '@/components/ui/use-toast';
import { Plus, User, Euro, Calendar, LayoutGrid, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

import type { Contact, Stage, Opportunity } from '../page';
import { OpportunityDialog } from './OpportunityDialog';
import { updateOpportunityStageAction } from '../actions';

// --- Sub-component: Targeta d'Oportunitat (Columnes) ---
const OpportunityCard: React.FC<{ opportunity: Opportunity; index: number }> = ({ opportunity, index }) => {
  return (
    <Draggable draggableId={opportunity.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={cn(
            'bg-background/80 backdrop-blur-sm p-3 rounded-lg mb-3 border-l-4 transition-all duration-300 cursor-pointer',
            snapshot.isDragging
              ? 'border-primary shadow-2xl shadow-primary/20 scale-105'
              : 'border-transparent hover:border-primary/50'
          )}
        >
          <h4 className="font-semibold text-foreground mb-2 text-sm">{opportunity.name}</h4>
          {opportunity.description && (
            <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opportunity.description}</p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-primary/80" /> {opportunity.contacts?.nom || 'Sense contacte'}
          </p>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-xs">
            <span className="font-semibold text-green-400 flex items-center gap-1">
              <Euro className="w-3 h-3" /> {opportunity.value?.toLocaleString('ca-ES') || '0'}
            </span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />{' '}
              {opportunity.close_date
                ? new Date(opportunity.close_date).toLocaleDateString('ca-ES', {
                    day: '2-digit',
                    month: '2-digit',
                  })
                : '-'}
            </span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

// --- Sub-component: Targeta d'Oportunitat (Files) ---
const OpportunityRowCard: React.FC<{ op: Opportunity; index: number; onEdit: (op: Opportunity) => void }> = ({ op, index, onEdit }) => {
  return (
    <Draggable draggableId={op.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onDoubleClick={() => onEdit(op)}
          className={cn(
            "grid grid-cols-2 md:grid-cols-5 gap-4 px-4 py-3 items-center rounded-lg bg-card shadow-md transition-all cursor-pointer",
            "hover:shadow-lg hover:scale-[1.01]",
            snapshot.isDragging ? "border-l-4 border-primary shadow-xl" : "border-l-4 border-transparent"
          )}
        >
          <div className="font-semibold text-base text-foreground col-span-2">{op.name}</div>
          <div className="flex items-center text-sm text-foreground">
            <User className="w-4 h-4 mr-2 text-primary" />
            {op.contacts?.nom || "N/A"}
          </div>
          <div className="flex items-center text-sm font-medium text-green-600">
            <Euro className="w-4 h-4 mr-2" />
            {op.value?.toLocaleString("ca-ES") || "0"} €
          </div>
          <div className="flex justify-end items-center text-xs text-muted-foreground gap-2">
            <Calendar className="w-3 h-3" />
            {op.close_date
              ? new Date(op.close_date).toLocaleDateString("ca-ES", { day: "2-digit", month: "2-digit" })
              : "-"}
          </div>
        </div>
      )}
    </Draggable>
  );
};

// --- Sub-component: Columna d'Etapa (Columnes) ---
const StageColumn: React.FC<{ stage: Stage; opportunities: Opportunity[]; onEditOpportunity: (opportunity: Opportunity) => void; onAddClick: () => void; }> = ({ stage, opportunities, onEditOpportunity, onAddClick }) => {
  const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
  const stageColors: Record<string, string> = {
    'Prospecte': 'border-blue-500',
    'Contactat': 'border-cyan-500',
    'Proposta Enviada': 'border-purple-500',
    'Negociació': 'border-yellow-500',
    'Guanyat': 'border-green-500',
    'Perdut': 'border-red-500'
  };

  return (
    <div className="flex flex-col h-full bg-muted/20 rounded-xl overflow-hidden">
      <div className={cn('p-4 border-t-4', stageColors[stage.name] || 'border-gray-500')}>
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-foreground mb-1">{stage.name}</h3>
          <Button variant="ghost" size="icon" onClick={onAddClick} className="w-7 h-7">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {opportunities.length} oportunitat{opportunities.length !== 1 ? 's' : ''} • €
          {totalValue.toLocaleString('ca-ES')}
        </p>
      </div>
      <Droppable droppableId={stage.name}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-2 pt-2 overflow-y-auto transition-colors ${
              snapshot.isDraggingOver ? 'bg-primary/10' : ''
            }`}
          >
            {opportunities.map((op, index) => (
              <div key={op.id} onDoubleClick={() => onEditOpportunity(op)}>
                <OpportunityCard opportunity={op} index={index} />
              </div>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

// --- Component Principal ---
export function PipelineClient({ initialStages, initialOpportunitiesByStage, initialContacts }: { 
  initialStages: Stage[]; 
  initialOpportunitiesByStage: Record<string, Opportunity[]>; 
  initialContacts: Contact[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [stages] = useState(initialStages);
  const [opportunitiesByStage, setOpportunitiesByStage] = useState(initialOpportunitiesByStage);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Partial<Opportunity> | null>(null);
  const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const originalState = JSON.parse(JSON.stringify(opportunitiesByStage));
    const sourceOpportunities = Array.from(opportunitiesByStage[source.droppableId]);
    const [movedOpportunity] = sourceOpportunities.splice(source.index, 1);
    const newState = { ...opportunitiesByStage, [source.droppableId]: sourceOpportunities };

    if (source.droppableId === destination.droppableId) {
      sourceOpportunities.splice(destination.index, 0, movedOpportunity);
    } else {
      const destinationOpportunities = Array.from(opportunitiesByStage[destination.droppableId] || []);
      destinationOpportunities.splice(destination.index, 0, movedOpportunity);
      newState[destination.droppableId] = destinationOpportunities;
    }
    setOpportunitiesByStage(newState);

    const updateResult = await updateOpportunityStageAction(draggableId, destination.droppableId);
    if (updateResult.error) {
      setOpportunitiesByStage(originalState);
      toast({ variant: 'destructive', title: 'Error', description: updateResult.error.message });
    } else {
      toast({ title: 'Èxit!', description: `Oportunitat moguda a "${destination.droppableId}".` });
    }
  };

  const handleOpenEditDialog = (opportunity: Opportunity) => {
    setEditingOpportunity(opportunity);
    setIsDialogOpen(true);
  };

  const handleOpenCreateDialog = (stageName?: string) => {
    const initialData = stageName ? { stage_name: stageName } : null;
    setEditingOpportunity(initialData);
    setIsDialogOpen(true);
  };

  // --- Vista en files (amb Drag&Drop) ---
  const RowView = () => {
    const stageColors: Record<string, string> = {
      'Prospecte': 'border-blue-500',
      'Contactat': 'border-cyan-500',
      'Proposta Enviada': 'border-purple-500',
      'Negociació': 'border-yellow-500',
      'Guanyat': 'border-green-500',
      'Perdut': 'border-red-500'
    };

    return (
      <div className="flex-1 overflow-y-auto pr-2 -mr-4">
        <Accordion type="multiple" defaultValue={stages.map(s => s.id)} className="w-full space-y-4">
          {stages.map(stage => {
            const opportunities = opportunitiesByStage[stage.name] || [];
            const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);

            return (
              <AccordionItem
                key={stage.id}
                value={stage.id}
                className={cn("bg-muted/20 rounded-xl overflow-hidden border-l-4", stageColors[stage.name] || "border-gray-500")}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="w-full flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-lg text-foreground">{stage.name}</h3>
                      <p className="text-xs text-muted-foreground text-left">
                        {opportunities.length} oportunitat{opportunities.length !== 1 ? "s" : ""} • €
                        {totalValue.toLocaleString("ca-ES")}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateDialog(stage.name);
                      }}
                      className="mr-2"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Afegir
                    </Button>
                  </div>
                </AccordionTrigger>

                <AccordionContent className="px-2 pb-2">
                  <Droppable droppableId={stage.name}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          "space-y-2 p-2 rounded-md transition-colors",
                          snapshot.isDraggingOver ? "bg-primary/5" : ""
                        )}
                      >
                        {opportunities.length > 0 ? (
                          opportunities.map((op, index) => (
                            <OpportunityRowCard key={op.id} op={op} index={index} onEdit={handleOpenEditDialog} />
                          ))
                        ) : (
                          <p className="text-center text-sm text-muted-foreground p-4">
                            No hi ha oportunitats en aquesta etapa.
                          </p>
                        )}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    );
  };

  return (
    <>
      <OpportunityDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contacts={initialContacts}
        stages={stages}
        onSuccess={() => router.refresh()}
        opportunityToEdit={editingOpportunity}
      />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold">Pipeline de Vendes</h1>
          <div className="flex items-center gap-2">
            <div className="bg-muted p-1 rounded-lg">
              <Button
                variant={viewMode === 'columns' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('columns')}
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'rows' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('rows')}
              >
                <Rows className="w-4 h-4" />
              </Button>
            </div>
            <Button onClick={() => handleOpenCreateDialog()}>
              <Plus className="w-4 h-4 mr-2" /> Nova Oportunitat
            </Button>
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          {viewMode === 'columns' ? (
            <div className="flex-1 grid grid-cols-6 gap-4 min-h-0">
              {stages.map(stage => (
                <StageColumn
                  key={stage.id}
                  stage={stage}
                  opportunities={opportunitiesByStage[stage.name] || []}
                  onEditOpportunity={handleOpenEditDialog}
                  onAddClick={() => handleOpenCreateDialog(stage.name)}
                />
              ))}
            </div>
          ) : (
            <RowView />
          )}
        </DragDropContext>
      </motion.div>
    </>
  );
}
