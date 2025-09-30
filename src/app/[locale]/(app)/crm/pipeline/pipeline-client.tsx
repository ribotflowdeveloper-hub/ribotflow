"use client";

import React, { useState, useEffect, useMemo, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { Plus, LayoutGrid, Rows, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { Contact, Stage, Opportunity } from './page';
import { OpportunityDialog } from './_components/OpportunityDialog';
import { updateOpportunityStageAction } from './actions';

import { ColumnsView } from './_components/ColumnsView';
import { RowsView } from './_components/RowsView';

interface PipelineClientProps {
    initialStages: Stage[];
    initialContacts: Contact[];
    initialOpportunities: Opportunity[];
}

export function PipelineClient({ initialStages, initialContacts, initialOpportunities }: PipelineClientProps) {
    const t = useTranslations('PipelinePage');
    const router = useRouter();

    // ✅ CORRECCIÓ: Assegurem que desestructurem correctament l'array retornat per useTransition.
    // El primer element és el booleà 'isPending', el segon és la funció 'startTransition'.
    const [isPending, startTransition] = useTransition();

    const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Partial<Opportunity> | null>(null);
    const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');
    // ✅ AFEGIT: Aquest useEffect sincronitza l'estat intern amb les dades que arriben del servidor.
    // Això soluciona el problema del refresc en crear una nova oportunitat.
    useEffect(() => {
        setOpportunities(initialOpportunities);
    }, [initialOpportunities]);
    const opportunitiesByStage = useMemo(() => {
        const grouped = initialStages.reduce((acc, stage) => {
            acc[stage.name] = [];
            return acc;
        }, {} as Record<string, Opportunity[]>);

        opportunities.forEach(op => {
            if (grouped[op.stage_name]) {
                grouped[op.stage_name].push(op);
            }
        });

        Object.values(grouped).forEach(ops => ops.sort((a, b) => (a.value ?? 0) - (b.value ?? 0)));

        return grouped;
    }, [opportunities, initialStages]);

    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return;
        }

        const newStage = destination.droppableId;
        const originalOpportunities = [...opportunities];

        setOpportunities(prevOps =>
            prevOps.map(op =>
                op.id === draggableId ? { ...op, stage_name: newStage } : op
            )
        );

        // Ara 'startTransition' és una funció i aquesta crida funcionarà.
        startTransition(async () => {
            const updateResult = await updateOpportunityStageAction(draggableId, newStage);
            if (updateResult.error) {
                setOpportunities(originalOpportunities);
                toast.error(t('toast.errorTitle'), { description: updateResult.error.message });
            } else {
                toast.success(t('toast.successTitle'));
            }
        });
    };

    const handleOpenEditDialog = (opportunity: Opportunity) => {
        setEditingOpportunity(opportunity);
        setIsDialogOpen(true);
    };

    const handleOpenCreateDialog = (stageName?: string) => {
        setEditingOpportunity(stageName ? { stage_name: stageName } : {});
        setIsDialogOpen(true);
    };

    const handleSuccess = () => {
        router.refresh();
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
                <div className="flex items-center gap-2">
                    <div className="bg-muted p-1 rounded-lg">
                        {/* ✅ Desactivem els botons de vista mentre hi ha una acció en curs */}
                        <Button variant={viewMode === 'columns' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('columns')} disabled={isPending}>
                            <LayoutGrid className="w-4 h-4" />
                        </Button>
                        <Button variant={viewMode === 'rows' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('rows')} disabled={isPending}>
                            <Rows className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button onClick={() => handleOpenCreateDialog()} disabled={isPending}>
                        {/* ✅ Mostrem un 'loader' si l'acció està pendent */}
                        {isPending ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2" />
                        )}
                        {t('addOpportunity')}
                    </Button>
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