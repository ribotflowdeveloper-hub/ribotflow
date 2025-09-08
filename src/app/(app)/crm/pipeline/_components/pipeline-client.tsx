"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Plus, User, Euro, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { type Contact, type Stage, type Opportunity } from '../page';
import OpportunityDialog from './OpportunityDialog';

// --- Sub-components (sense canvis) ---
const OpportunityCard: React.FC<{ opportunity: Opportunity, index: number, onEdit: (opportunity: Opportunity) => void }> = ({ opportunity, index, onEdit }) => {
  return (
    <Draggable draggableId={opportunity.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          onDoubleClick={() => onEdit(opportunity)}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-background/80 backdrop-blur-sm p-3 rounded-lg mb-3 border-l-4 transition-all duration-300 cursor-pointer ${snapshot.isDragging ? 'border-primary shadow-2xl shadow-primary/20 scale-105' : 'border-transparent hover:border-primary/50'}`}
        >
          <h4 className="font-semibold text-foreground mb-2 text-sm">{opportunity.name}</h4>
          {opportunity.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opportunity.description}</p>}
          <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2"><User className="w-4 h-4 text-primary/80"/> {opportunity.contacts?.nom || 'Sense contacte'}</p>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-xs">
            <span className="font-semibold text-green-400 flex items-center gap-1"><Euro className="w-3 h-3"/> {opportunity.value?.toLocaleString() || '0'}</span>
            <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> {opportunity.close_date ? new Date(opportunity.close_date).toLocaleDateString('ca-ES') : '-'}</span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

const StageColumn: React.FC<{ stage: Stage, opportunities: Opportunity[], onEditOpportunity: (opportunity: Opportunity) => void }> = ({ stage, opportunities, onEditOpportunity }) => {
  const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
  const stageColors: Record<string, string> = { 'Prospecte': 'border-blue-500', 'Contactat': 'border-cyan-500', 'Proposta Enviada': 'border-purple-500', 'Negociació': 'border-yellow-500', 'Guanyat': 'border-green-500', 'Perdut': 'border-red-500' };

  return (
    <div className="flex flex-col h-full bg-muted/20 rounded-xl overflow-hidden">
      <div className={`p-4 rounded-t-xl border-t-4 ${stageColors[stage.name] || 'border-gray-500'}`}>
        <h3 className="font-bold text-lg text-foreground mb-1">{stage.name}</h3>
        <p className="text-xs text-muted-foreground">{opportunities.length} oportunitat{opportunities.length !== 1 ? 's' : ''} • €{totalValue.toLocaleString()}</p>
      </div>
      <Droppable droppableId={stage.name}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-2 pt-2 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
          >
            {opportunities.map((op, index) => (
              <OpportunityCard key={op.id} opportunity={op} index={index} onEdit={onEditOpportunity} />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};


export function PipelineClient({ initialStages, initialOpportunitiesByStage, initialContacts }: { initialStages: Stage[], initialOpportunitiesByStage: Record<string, Opportunity[]>, initialContacts: Contact[] }) {
  const { toast } = useToast();
  const supabase = createClient();
  const [stages] = useState(initialStages);
  const [opportunitiesByStage, setOpportunitiesByStage] = useState(initialOpportunitiesByStage);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  const onDragEnd = async (result: DropResult) => {
    // ... (la teva lògica onDragEnd es queda igual)
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
    const { error } = await supabase.from('opportunities').update({ stage_name: destination.droppableId }).eq('id', draggableId);
    if (error) {
      setOpportunitiesByStage(originalState);
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } else {
      toast({ title: 'Èxit!', description: `Oportunitat moguda a "${destination.droppableId}".` });
    }
  };

  const handleOpenEditDialog = (opportunity: Opportunity) => { setEditingOpportunity(opportunity); setIsDialogOpen(true); };
  const handleOpenCreateDialog = () => { setEditingOpportunity(null); setIsDialogOpen(true); };
  const handleSuccess = () => { window.location.reload(); };
  
  return (
    <>
      <OpportunityDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} contacts={initialContacts} stages={stages} onSuccess={handleSuccess} opportunityToEdit={editingOpportunity} />

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold">Pipeline de Vendes</h1>
          <Button onClick={handleOpenCreateDialog}><Plus className="w-4 h-4 mr-2" /> Nova Oportunitat</Button>
        </div>

        {/* ✅ AQUESTA ÉS LA SECCIÓ CORREGIDA I DEFINITIVA ✅ */}
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex-1 grid grid-cols-6 gap-4 min-w-0">
            {stages.map(stage => (
              <StageColumn 
                key={stage.id} 
                stage={stage} 
                opportunities={opportunitiesByStage[stage.name] || []} 
                onEditOpportunity={handleOpenEditDialog} 
              />
            ))}
          </div>
        </DragDropContext>
      </motion.div>
    </>
  );
}