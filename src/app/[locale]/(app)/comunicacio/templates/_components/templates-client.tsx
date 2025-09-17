/**
 * @file templates-client.tsx
 * @summary Orquesta la UI de la página de plantillas, gestionando el estado y la comunicación entre subcomponentes.
 */
"use client";

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useTranslations } from 'next-intl';
import { type EmailTemplate } from '../page';
import { saveTemplateAction, deleteTemplateAction } from './actions';

// Importamos los nuevos sub-componentes desglosados
import { TemplateList } from './TemplateList';
import { TemplateEditor } from './TemplateEditor';
import { TemplateVariables } from './TemplateVaribales';

export function TemplatesClient({ initialTemplates }: { initialTemplates: EmailTemplate[] }) {
  const t = useTranslations('TemplatesPage');
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(initialTemplates[0] || null);
  const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);

  /**
   * @summary Crea una nueva plantilla en blanco.
   */
  const handleNewTemplate = () => {
    const newTpl: EmailTemplate = { id: 'new', name: t('newTemplateName'), subject: '', body: t('newTemplateBody'), variables: [], created_at: new Date().toISOString(), user_id: '' };
    setSelectedTemplate(newTpl);
  };

  /**
   * @summary Guarda la plantilla actual (crea o actualiza).
   */
  const handleSaveTemplate = (currentTemplate: EmailTemplate, detectedVariables: string[]) => {
    const templateData = { name: currentTemplate.name, subject: currentTemplate.subject, body: currentTemplate.body, variables: detectedVariables };
    startSaveTransition(async () => {
      const { data, error } = await saveTemplateAction(templateData, currentTemplate.id);
      if (error) {
        toast.error(t('toastErrorTitle'), { description: error.message });
      } else if (data) {
        toast.success(t('toastSuccessTitle'), { description: t('toastSaveSuccessDescription') });
        if (selectedTemplate?.id === 'new') { setTemplates(prev => [data, ...prev]); } 
        else { setTemplates(prev => prev.map(t => t.id === data.id ? data : t)); }
        setSelectedTemplate(data);
      }
    });
  };

  /**
   * @summary Elimina una plantilla.
   */
  const handleDeleteTemplate = () => {
    if (!templateToDelete) return;
    startDeleteTransition(async () => {
      const { error } = await deleteTemplateAction(templateToDelete.id);
      if (error) {
        toast.error(t('toastErrorTitle'), { description: error.message });
      } else {
        toast.success(t('toastSuccessTitle'), { description: t('toastDeleteSuccessDescription') });
        const newTemplates = templates.filter(t => t.id !== templateToDelete.id);
        setTemplates(newTemplates);
        setSelectedTemplate(newTemplates[0] || null);
      }
      setTemplateToDelete(null);
    });
  };

  return (
    <>
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <h1 className="text-3xl font-bold">{t('pageTitle')}</h1>
          <Button onClick={() => selectedTemplate && handleSaveTemplate(selectedTemplate, [])} disabled={isSaving || !selectedTemplate}>
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
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
          />
        </div>
      </motion.div>
      
      <AlertDialog open={!!templateToDelete} onOpenChange={() => setTemplateToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('deleteConfirmDescription')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTemplate} disabled={isDeleting} className="bg-destructive ...">{isDeleting ? t('deletingButton') : t('confirmDeleteButton')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}