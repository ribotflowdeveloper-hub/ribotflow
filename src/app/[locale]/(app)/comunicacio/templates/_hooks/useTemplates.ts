"use client";

import { useState, useTransition } from 'react';
import { toast } from "sonner";
import { useTranslations } from 'next-intl';
import { type EmailTemplate } from '../page';
import { saveTemplateAction, deleteTemplateAction } from '../_components/actions';

type UseTemplatesProps = {
    initialTemplates: EmailTemplate[];
};

export function useTemplates({ initialTemplates }: UseTemplatesProps) {
    const t = useTranslations('TemplatesPage');
    const [isSaving, startSaveTransition] = useTransition();
    const [isDeleting, startDeleteTransition] = useTransition();

    const [templates, setTemplates] = useState(initialTemplates);
    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(initialTemplates[0] || null);
    const [templateToDelete, setTemplateToDelete] = useState<EmailTemplate | null>(null);
    const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

    const handleNewTemplate = () => {
        const newTemplateBody = t.raw('newTemplateBody');
        const newTpl: EmailTemplate = {
            id: 'new',
            name: t('newTemplateName'),
            subject: '',
            body: newTemplateBody,
            variables: [],
            created_at: new Date().toISOString(),
            user_id: ''
        };
        setSelectedTemplate(newTpl);
    };

    const handleSaveTemplate = () => {
        if (!selectedTemplate) return;
        const templateData = { 
            name: selectedTemplate.name, 
            subject: selectedTemplate.subject, 
            body: selectedTemplate.body, 
            variables: detectedVariables 
        };
        
        startSaveTransition(async () => {
            const { data, error } = await saveTemplateAction(templateData, selectedTemplate.id);
            if (error) {
                toast.error(t('toastErrorTitle'), { description: error.message });
            } else if (data) {
                toast.success(t('toastSuccessTitle'), { description: t('toastSaveSuccessDescription') });
                if (selectedTemplate?.id === 'new') { 
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

    // Retornem tots els estats i funcions que el component necessita
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
    };
}