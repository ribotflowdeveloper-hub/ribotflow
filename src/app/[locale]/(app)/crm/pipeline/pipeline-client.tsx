"use client";

import React, { useState, useMemo, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { DragDropContext, type DropResult } from '@hello-pangea/dnd';
import { toast } from 'sonner';
import { Plus, LayoutGrid, Rows, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import type { Contact, Stage, Opportunity } from './page';
import { OpportunityDialog } from './_components/OpportunityDialog';
import { updateOpportunityStageAction} from './actions';
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
    const [isPending, startTransition] = useTransition();

    // ✅ BONA PRÀCTICA 1: Gestionem una llista plana d'oportunitats.
    // És la nostra "font única de la veritat" i és molt més fàcil d'actualitzar.
    const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
    
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingOpportunity, setEditingOpportunity] = useState<Partial<Opportunity> | null>(null);
    const [viewMode, setViewMode] = useState<'columns' | 'rows'>('columns');

    // Sincronitza l'estat intern si les dades del servidor canvien (després d'un router.refresh)
    useEffect(() => {
        setOpportunities(initialOpportunities);
    }, [initialOpportunities]);

    // ✅ BONA PRÀCTICA 2: Calculem l'objecte agrupat només quan és necessari (per a renderitzar).
    // 'useMemo' assegura que aquest càlcul només es fa si les oportunitats o les etapes canvien.
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
    
    /**
     * S'executa en acabar el drag-and-drop. Ara és molt més simple.
     */
    const onDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;
        if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
            return;
        }
        
        const newStage = destination.droppableId;
        const originalOpportunities = [...opportunities];
        
        // ✅ BONA PRÀCTICA 3: Actualització Optimista sobre l'estat pla.
        // Simplement trobem l'oportunitat moguda i li canviem la 'stage_name'.
        setOpportunities(prevOps =>
            prevOps.map(op =>
                op.id === draggableId ? { ...op, stage_name: newStage } : op
            )
        );

        startTransition(async () => {
            const updateResult = await updateOpportunityStageAction(draggableId, newStage);
            if (updateResult.error) {
                setOpportunities(originalOpportunities); // Revertim si hi ha error
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
    
    // ✅ BONA PRÀCTICA 4: Utilitzem router.refresh() en lloc de recarregar la pàgina.
    // És més ràpid i manté l'estat del client.
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
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <div className="flex items-center gap-2">
                        <div className="bg-muted p-1 rounded-lg">
                            <Button variant={viewMode === 'columns' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('columns')} aria-label={t('columnViewLabel')} disabled={isPending}>
                                <LayoutGrid className="w-4 h-4" />
                            </Button>
                            <Button variant={viewMode === 'rows' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('rows')} aria-label={t('rowViewLabel')} disabled={isPending}>
                                <Rows className="w-4 h-4" />
                            </Button>
                        </div>
                        <Button onClick={() => handleOpenCreateDialog()} disabled={isPending}>
                            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : <Plus className="w-4 h-4 mr-2" />}
                            {t('addOpportunity')}
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