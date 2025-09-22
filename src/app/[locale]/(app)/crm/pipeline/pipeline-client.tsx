/**
 * @file src/app/[locale]/(app)/crm/pipeline/_components/pipeline-client.tsx
 * @summary Component de client que gestiona la interfície interactiva del Pipeline.
 */
"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { Plus, LayoutGrid, Rows } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { Contact, Stage, Opportunity } from './page';
import { OpportunityDialog } from './_components/OpportunityDialog';
import { updateOpportunityStageAction } from './actions';
import { createClient } from '@/lib/supabase/client';

// Importació dels nous sub-components per a les vistes
import { ColumnsView } from './_components/ColumnsView';
import { RowsView } from './_components/RowsView';
import { PipelineSkeleton } from './_components/PipelineSkeleton';

/**
 * @summary Component de Client principal per al Pipeline.
 * @description Orquestra l'estat i la lògica per a les diferents vistes del pipeline.
 */
export function PipelineClient({ initialStages, initialContacts }: {
    initialStages: Stage[];
    initialContacts: Contact[];
}) {
    const t = useTranslations('PipelinePage');
    const router = useRouter();
    const [stages] = useState(initialStages);
    const [opportunitiesByStage, setOpportunitiesByStage] = useState<Record<string, Opportunity[]>>({});
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Partial<Opportunity> | null>(null);
    const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchOpportunities = async () => {
            const supabase = createClient()
;
            const { data: opportunitiesData, error } = await supabase
                .from('opportunities')
                .select('*, contacts(id, nom)');

            if (error) {
                toast.error(t('toast.errorTitle'), { description: t('loadingError') });
                setIsLoading(false);
                return;
            }

            const opportunities = (opportunitiesData as Opportunity[]) || [];
            const groupedOpportunities = initialStages.reduce((acc, stage) => {
                acc[stage.name] = opportunities.filter(op => op.stage_name === stage.name)
                                                .sort((a, b) => (a.value ?? 0) - (b.value ?? 0));
                return acc;
            }, {} as Record<string, Opportunity[]>);

            setOpportunitiesByStage(groupedOpportunities);
            setIsLoading(false);
        };
        fetchOpportunities();
    }, [initialStages, t]);

     /**
     * @summary Funció que s'executa quan s'acaba d'arrossegar una oportunitat.
     * ✅ CORREGIT I REESTRUCTURAT per gestionar correctament el reordenament i el moviment.
     */
     const onDragEnd = async (result: DropResult) => {
        const { source, destination, draggableId } = result;

        // Si l'element es deixa anar fora d'una zona vàlida, no fem res.
        if (!destination) return;

        // Si es deixa anar a la mateixa posició exacta, tampoc fem res.
        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }

        // --- Patró d'UI Optimista (Optimistic UI Update) ---
        const originalState = JSON.parse(JSON.stringify(opportunitiesByStage));

        // CAS 1: Reordenar dins de la MATEIXA columna
        if (source.droppableId === destination.droppableId) {
            const column = opportunitiesByStage[source.droppableId];
            const newOpportunitiesInColumn = Array.from(column);
            const [movedOpportunity] = newOpportunitiesInColumn.splice(source.index, 1);
            newOpportunitiesInColumn.splice(destination.index, 0, movedOpportunity);

            // Actualitzem l'estat de la UI a l'instant
            const newState = {
                ...opportunitiesByStage,
                [source.droppableId]: newOpportunitiesInColumn,
            };
            setOpportunitiesByStage(newState);
            
            // TODO: Crida a una Server Action per guardar el nou ordre (opcional però recomanat)
            // const updateResult = await updateOpportunityOrderAction(newOpportunitiesInColumn);
            // if (updateResult.error) {
            //     setOpportunitiesByStage(originalState);
            //     toast.error("Error al reordenar");
            // }

        // CAS 2: Moure a una columna DIFERENT
        } else {
            const sourceColumn = opportunitiesByStage[source.droppableId];
            const destColumn = opportunitiesByStage[destination.droppableId] || [];
            
            const newSourceOpportunities = Array.from(sourceColumn);
            const newDestOpportunities = Array.from(destColumn);
            
            const [movedOpportunity] = newSourceOpportunities.splice(source.index, 1);
            newDestOpportunities.splice(destination.index, 0, movedOpportunity);

            // Actualitzem l'estat de la UI a l'instant
            const newState = {
                ...opportunitiesByStage,
                [source.droppableId]: newSourceOpportunities,
                [destination.droppableId]: newDestOpportunities,
            };
            setOpportunitiesByStage(newState);
            
            // Cridem a la Server Action per actualitzar l'etapa a la base de dades
            const updateResult = await updateOpportunityStageAction(draggableId, destination.droppableId);

            if (updateResult.error) {
                setOpportunitiesByStage(originalState);
                toast.error(t('toastErrorTitle'), { description: updateResult.error.message });
            } else {
                toast.success(t('toastSuccessTitle'), { description: t('toastMoved', { stageName: destination.droppableId }) });
            }
        }
    };

    const handleOpenEditDialog = (opportunity: Opportunity) => {
        setEditingOpportunity(opportunity);
        setIsDialogOpen(true);
    };

    const handleOpenCreateDialog = (stageName?: string) => {
        const initialData = stageName ? { stage_name: stageName } : {};
        setEditingOpportunity(initialData);
        setIsDialogOpen(true);
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

                {isLoading ? (
                    <PipelineSkeleton stages={initialStages} viewMode={viewMode} />
                ) : (
                    <DragDropContext onDragEnd={onDragEnd}>
                        {viewMode === 'columns' ? (
                            <ColumnsView
                                stages={stages}
                                opportunitiesByStage={opportunitiesByStage}
                                onEditOpportunity={handleOpenEditDialog}
                                onAddClick={handleOpenCreateDialog}
                            />
                        ) : (
                            <RowsView
                                stages={stages}
                                opportunitiesByStage={opportunitiesByStage}
                                onEditOpportunity={handleOpenEditDialog}
                                onAddClick={handleOpenCreateDialog}
                            />
                        )}
                    </DragDropContext>
                )}
            </motion.div>
        </>
    );
}