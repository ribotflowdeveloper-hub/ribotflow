"use client";

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTemplates } from '../_hooks/useTemplates';

import { TemplateList } from './TemplateList';
import { TemplateEditor } from './TemplateEditor';
import { TemplateVariables } from './TemplateVariables';
import { type EmailTemplate } from '../page';

export function TemplatesClient({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
    const {
        isSaving, isDeleting,
        templates,
        selectedTemplate, setSelectedTemplate,
        templateToDelete, setTemplateToDelete,
        // ✅ CORRECCIÓ 1: 'detectedVariables' ja no es necessita aquí.
        // El seu valor es gestiona internament al hook.
        setDetectedVariables,
        handleNewTemplate,
        handleSaveTemplate,
        handleDeleteTemplate,
        t,
    } = useTemplates({ initialTemplates });

    return (
        <>
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
                    <Button onClick={handleSaveTemplate} disabled={isSaving || !selectedTemplate}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {t('saveButton')}
                    </Button>
                </div>

                <div className="flex-1 grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6 min-h-0">
                    <TemplateList
                        templates={templates}
                        selectedTemplateId={selectedTemplate?.id || null}
                        onSelectTemplate={setSelectedTemplate}
                        onNewTemplate={handleNewTemplate}
                        onSetTemplateToDelete={setTemplateToDelete}
                    />
                    <TemplateEditor
                        selectedTemplate={selectedTemplate}
                        onUpdateTemplate={setSelectedTemplate}
                        onSave={handleSaveTemplate}
                    />
                    <TemplateVariables
                        selectedTemplate={selectedTemplate}
                        onVariablesChange={setDetectedVariables}
                    />
                </div>
            </motion.div>

            {/* ✅ CORRECCIÓ 2: Canviem 'onOpenChange' per a que passi el valor correcte */}
            <AlertDialog open={!!templateToDelete} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setTemplateToDelete(null);
                }
            }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteTemplate} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">{isDeleting ? t('deletingButton') : t('confirmDeleteButton')}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}