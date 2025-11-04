// /app/[locale]/(app)/crm/pipeline/pipeline-client.tsx (Refactoritzat i CORREGIT)
"use client";

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DragDropContext } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { Plus, LayoutGrid, Rows, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ✅ 1. Importem el tipus 'Row' complet de la base de dades
import { type Database } from '@/types/supabase';
type FullContact = Database['public']['Tables']['contacts']['Row'];

// ✅ 2. Importem els altres tipus
import { type Stage, type OpportunityWithContact } from './_components/PipelineData';
import { usePipeline } from './_hooks/usePipeline';
import { OpportunityDialog } from './_components/OpportunityDialog';
import { ColumnsView } from './_components/ColumnsView';
import { RowsView } from './_components/RowsView';

// ➕ AFEGIT: Importem el hook per detectar la mida de la pantalla
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface PipelineClientProps {
    initialStages: Stage[];
    // ✅ 3. 'initialContacts' ara utilitza el tipus complet
    initialContacts: FullContact[];
    initialOpportunities: OpportunityWithContact[];
}

export function PipelineClient({ initialStages, initialContacts, initialOpportunities }: PipelineClientProps) {
    const t = useTranslations('PipelinePage');

    const [opportunities, setOpportunities] = useState(initialOpportunities);

    useEffect(() => {
        setOpportunities(initialOpportunities);
    }, [initialOpportunities]);

    const {
        isPending,
        opportunitiesByStage,
        viewMode, // Aquesta és la vista seleccionada per l'usuari (default: 'columns')
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

    // ➕ AFEGIT: Detectem si és mòbil (breakpoint 'md' de Tailwind = 768px)
    // Utilitzem 767px per ser < md
    const isMobile = useMediaQuery("(max-width: 767px)");

    // ❗ CORREGIT: Decidim quina vista mostrar
    // Si és mòbil, forcem 'rows'. Si no, respectem la selecció de l'usuari.
    const effectiveViewMode = isMobile ? 'rows' : viewMode;

    return (
        <>
            <OpportunityDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                // ✅ 4. Aquesta línia ara és vàlida.
                contacts={initialContacts}
                stages={initialStages}
                onSuccess={handleSuccess}
                opportunityToEdit={editingOpportunity}
            />
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h1 className="text-3xl font-bold">{t('title')}</h1>
                    <div className="flex items-center gap-2">

                        {/* ❗ CORREGIT: Afegim 'hidden md:flex' per ocultar en mòbil */}
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

                    {/* ❗ CORREGIT: Usem 'effectiveViewMode' per decidir el render */}
                    {effectiveViewMode === 'columns' ? (
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