// /src/app/[locale]/(app)/comunicacio/templates/_hooks/useTemplates.ts (FITXER COMPLET I CORREGIT)
"use client";

import { useState, useTransition } from 'react';
import { toast } from "sonner";
import { useTranslations } from 'next-intl';
import type { EmailTemplate } from '@/types/db';
import { saveTemplateAction, deleteTemplateAction } from '../actions';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ 1. Importem el tipus

type UseTemplatesProps = {
    initialTemplates: EmailTemplate[];
    limitStatus: UsageCheckResult; // ✅ 2. Afegim la prop de límit
};

export function useTemplates({ initialTemplates, limitStatus }: UseTemplatesProps) { // ✅ 3. Rebem el límit
    const t = useTranslations('TemplatesPage');
    const t_billing = useTranslations('Billing'); // Per als missatges de límit
    const [isSaving, startSaveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();

    const [templates, setTemplates] = useState(initialTemplates);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(initialTemplates[0] || null);
    const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
    const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

    const handleNewTemplate = () => {
        // ✅ 4. Comprovació de límit ABANS de crear l'objecte
        if (!limitStatus.allowed) {
            toast.error(t_billing('limitReachedTitle'), {
                description: limitStatus.error || "No pots crear més plantilles."
            });
            return; // Aturem l'acció
        }

        const newTemplateBody = t.raw('newTemplateBody');
        const newTpl: EmailTemplate = {
            id: -1, // Use -1 or another sentinel number for new templates
            name: t('newTemplateName'),
            subject: '',
            body: newTemplateBody,
            variables: [],
            created_at: new Date().toISOString(),
            user_id: '',
            team_id: null // Aquesta prop és nullable, està bé
        };
        setSelectedTemplate(newTpl);
    };

    const handleSaveTemplate = () => {
        if (!selectedTemplate) return;
        
        // Comprovació de límit només en crear
        const isCreatingNew = selectedTemplate.id === -1;
        if (isCreatingNew && !limitStatus.allowed) {
             toast.error(t_billing('limitReachedTitle'), {
                description: limitStatus.error || "No pots crear més plantilles."
            });
            return;
        }

        const templateData = { 
            name: selectedTemplate.name, 
            subject: selectedTemplate.subject, 
            body: selectedTemplate.body, 
            variables: detectedVariables 
        };
        
        startSaveTransition(async () => {
            // ✅ 5. Passem l'ID correctament (null si és nou)
            const templateIdToSave = isCreatingNew ? null : String(selectedTemplate.id);
            const { data, error } = await saveTemplateAction(templateData, templateIdToSave);
            
            if (error) {
                toast.error(t('toastErrorTitle'), { description: error.message });
            } else if (data) {
                toast.success(t('toastSuccessTitle'), { description: t('toastSaveSuccessDescription') });
                if (isCreatingNew) { 
                    setTemplates(prev => [data, ...prev]); 
                } else { 
                    setTemplates(prev => prev.map(t => t.id === data.id ? data : t)); 
                }
                setSelectedTemplate(data);
            }
        });
    };

    const handleDeleteTemplate = () => {
        if (!templateToDelete) return;
        startDeleteTransition(async () => {
            const { error } = await deleteTemplateAction(String(templateToDelete.id));
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

    return {
        isSaving, isDeleting,
        templates,
        selectedTemplate, setSelectedTemplate,
        templateToDelete, setTemplateToDelete,
        detectedVariables, setDetectedVariables,
        handleNewTemplate,
        handleSaveTemplate,
        handleDeleteTemplate,
        t,
        t_billing, // ✅ 6. Exportem t_billing per al client
    };
}