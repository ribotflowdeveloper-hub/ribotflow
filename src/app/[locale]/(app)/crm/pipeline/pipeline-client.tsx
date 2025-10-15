// /app/[locale]/(app)/crm/pipeline/pipeline-client.tsx (Refactoritzat)
"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { Plus, LayoutGrid, Rows, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ✅ 1. Importem els nous tipus des del component de dades.
import { type Stage, type Contact, type OpportunityWithContact } from './_components/PipelineData';
import { usePipeline } from './_hooks/usePipeline';
import { OpportunityDialog } from './_components/OpportunityDialog';
import { ColumnsView } from './_components/ColumnsView';
import { RowsView } from './_components/RowsView';

interface PipelineClientProps {
    initialStages: Stage[];
    initialContacts: Contact[];
    initialOpportunities: OpportunityWithContact[];
}

export function PipelineClient({ initialStages, initialContacts, initialOpportunities }: PipelineClientProps) {
    const t = useTranslations('PipelinePage');
    
    // ✅ 2. L'estat ara gestiona el tipus enriquit 'OpportunityWithContact'.
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
                            <Button variant={viewMode === 'columns' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('columns')} aria-label={t('columnViewLabel')} disabled={isPending}><LayoutGrid className="w-4 h-4" /></Button>
                            <Button variant={viewMode === 'rows' ? 'secondary' : 'ghost'} size="icon" onClick={() => setViewMode('rows')} aria-label={t('rowViewLabel')} disabled={isPending}><Rows className="w-4 h-4" /></Button>
                        </div>
                        <Button onClick={() => handleOpenDialog()} disabled={isPending}>
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
                            onEditOpportunity={(op) => handleOpenDialog(op)}
                            onAddClick={(stage) => handleOpenDialog(undefined, stage)}
                        />
                    ) : (
                        <RowsView
                            stages={initialStages}
                            opportunitiesByStage={opportunitiesByStage}
                            onEditOpportunity={(op) => handleOpenDialog(op)}
                            onAddClick={(stage) => handleOpenDialog(undefined, stage)}
                        />
                    )}
                </DragDropContext>
            </motion.div>
        </>
    );
}