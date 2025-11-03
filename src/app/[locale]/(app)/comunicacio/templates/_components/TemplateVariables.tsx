/**
 * @file TemplateVariables.tsx
 * @summary Renderitza la columna dreta que detecta i mostra les variables de la plantilla.
 */
"use client";

import React, { useMemo, useEffect } from 'react'; // Només necessitem aquests hooks
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Variable } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { EmailTemplate } from '@/types/db';

interface TemplateVariablesProps {
  selectedTemplate: EmailTemplate | null;
  onVariablesChange: (variables: string[]) => void;
}

export function TemplateVariables({ selectedTemplate, onVariablesChange }: TemplateVariablesProps) {
    const t = useTranslations('TemplatesPage');

    // ✅ BONA PRÀCTICA: Utilitzem 'useMemo' per a calcular dades derivades.
    // Aquest codi només s'executa si 'selectedTemplate' canvia.
    const detectedVariables = useMemo(() => {
        if (!selectedTemplate) {
            return [];
        }
        const content = `${selectedTemplate.subject || ''} ${selectedTemplate.body || ''}`;
        const foundVariables = content.match(/\{\{([^}]+)\}\}/g) || [];
        // Retornem un array net de variables úniques.
        return [...new Set(foundVariables.map(v => v.replace(/[{}]/g, '').trim()))];
    }, [selectedTemplate]);

    // ✅ BONA PRÀCTICA: Utilitzem 'useEffect' NOMÉS per a efectes secundaris.
    // En aquest cas, el nostre efecte és notificar al component pare quan les variables han canviat.
    useEffect(() => {
        onVariablesChange(detectedVariables);
    }, [detectedVariables, onVariablesChange]);

    return (
        <div className="glass-card flex flex-col overflow-hidden">
            <div className="p-4 border-b border-border">
                <h3 className="font-semibold flex items-center gap-2">
                    <Variable className="w-4 h-4 text-primary"/>{t('detectedVariablesTitle')}
                </h3>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
                <p className="text-xs text-muted-foreground">{t('variablesDescription')}</p>
                <div className="flex flex-wrap gap-2">
                    {detectedVariables.length > 0 ? (
                        detectedVariables.map(v => (
                            <Button
                                key={v}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    navigator.clipboard.writeText(`{{${v}}}`);
                                    toast.success(t('toastCopiedTitle'), {
                                        description: t('toastCopiedDescription', { variable: `{{${v}}}` }),
                                    });
                                }}
                            >
                                {`{{${v}}}`}
                            </Button>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground italic">{t('noVariablesDetected')}</p>
                    )}
                </div>
            </div>
        </div>
    );
}