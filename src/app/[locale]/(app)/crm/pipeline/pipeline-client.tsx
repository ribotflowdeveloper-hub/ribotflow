"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { Plus, LayoutGrid, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { Contact, Stage, Opportunity } from './page';
import { OpportunityDialog } from './_components/OpportunityDialog';
import { updateOpportunityStageAction } from './actions';

// Suposem que aquests components existeixen i reben les dades necessàries
import { ColumnsView } from './_components/ColumnsView';
import { RowsView } from './_components/RowsView';

// Definim les propietats que rep aquest component des de PipelineData
interface PipelineClientProps {
    initialStages: Stage[];
    initialContacts: Contact[];
    initialOpportunities: Opportunity[]; // ✅ Rebrem les oportunitats directament
}

/**
 * Component de client principal per al Pipeline.
 * Orquestra l'estat, la interactivitat (drag-and-drop) i les diferents vistes.
 */
export function PipelineClient({ initialStages, initialContacts, initialOpportunities }: PipelineClientProps) {
    const t = useTranslations('PipelinePage');
    const [opportunitiesByStage, setOpportunitiesByStage] = useState<Record<string, Opportunity[]>>({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Partial<Opportunity> | null>(null);
    const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');

    // ✅ AQUEST ÉS EL CANVI CLAU:
    // Ja no fem un 'fetch' de dades aquí. Utilitzem les dades que ens arriben
    // des del Server Component (`PipelineData.tsx`) per inicialitzar l'estat.
    useEffect(() => {
        const groupedOpportunities = initialStages.reduce((acc, stage) => {
            acc[stage.name] = initialOpportunities
                .filter(op => op.stage_name === stage.name)
                .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
            return acc;
        }, {} as Record<string, Opportunity[]>);
        setOpportunitiesByStage(groupedOpportunities);
    }, [initialStages, initialOpportunities]);

    /**
     * S'executa quan s'acaba d'arrossegar una oportunitat (drag-and-drop).
     */
    const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return;
        }

        // Patró d'UI Optimista: actualitzem la UI a l'instant
        const originalState = JSON.parse(JSON.stringify(opportunitiesByStage));
        const sourceColumn = Array.from(opportunitiesByStage[source.droppableId]);
        const [movedOpportunity] = sourceColumn.splice(source.index, 1);
        
        // Si es mou a una columna diferent
        if (source.droppableId !== destination.droppableId) {
            const destColumn = Array.from(opportunitiesByStage[destination.droppableId] || []);
            destColumn.splice(destination.index, 0, movedOpportunity);
            
            const newState = {
                ...opportunitiesByStage,
                [source.droppableId]: sourceColumn,
                [destination.droppableId]: destColumn,
            };
            setOpportunitiesByStage(newState);
            
            // Cridem la Server Action per desar el canvi a la BD
            const updateResult = await updateOpportunityStageAction(draggableId, destination.droppableId);
            if (updateResult.error) {
                setOpportunitiesByStage(originalState); // Revertim si hi ha error
                toast.error(t('toast.errorTitle'), { description: updateResult.error.message });
            } else {
                toast.success(t('toast.successTitle'));
            }
        } else {
            // Reordenar dins la mateixa columna (lògica similar)
            sourceColumn.splice(destination.index, 0, movedOpportunity);
            const newState = { ...opportunitiesByStage, [source.droppableId]: sourceColumn };
            setOpportunitiesByStage(newState);
            // Aquí podries cridar a una acció per desar el nou ordre si fos necessari
        }
    };

    const handleOpenEditDialog = (opportunity: Opportunity) => {
        setEditingOpportunity(opportunity);
        setIsDialogOpen(true);
    };

    const handleOpenCreateDialog = (stageName?: string) => {
        setEditingOpportunity(stageName ? { stage_name: stageName } : {});
        setIsDialogOpen(true);
    };
    
    // Funció per refrescar la pàgina després de desar amb èxit
    const handleSuccess = () => {
        window.location.reload();
    };

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
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <div className="flex items-center gap-2">
                        <div className="bg-muted p-1 rounded-lg">
                            <Button variant={viewMode === 'columns' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('columns')} aria-label={t('columnViewLabel')}>
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button variant={viewMode === 'rows' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('rows')} aria-label={t('rowViewLabel')}>
                                <Rows className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button onClick={() => handleOpenCreateDialog()}>
                            <Plus className="w-4 h-4 mr-2" />{t('addOpportunity')}
                        </Button>
                    </div>
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    {viewMode === 'columns' ? (
                        <ColumnsView
                            stages={initialStages}
                            opportunitiesByStage={opportunitiesByStage}
                            onEditOpportunity={handleOpenEditDialog}
                            onAddClick={handleOpenCreateDialog}
                        />
                    ) : (
                        <RowsView
                            stages={initialStages}
                            opportunitiesByStage={opportunitiesByStage}
                            onEditOpportunity={handleOpenEditDialog}
                            onAddClick={handleOpenCreateDialog}
                        />
                    )}
                </DragDropContext>
            </motion.div>
        </>
    );
}

