/**
 * @file TemplateVariables.tsx
 * @summary Renderitza la columna dreta que detecta i mostra les variables de la plantilla.
 */
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Variable } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { EmailTemplate } from '../page';

interface TemplateVariablesProps {
  selectedTemplate: EmailTemplate | null;
}

export function TemplateVariables({ selectedTemplate }: TemplateVariablesProps) {
  const t = useTranslations('TemplatesPage');
  const [detectedVariables, setDetectedVariables] = useState<string[]>([]);

  // Efecte per extreure les variables cada cop que el contingut de la plantilla canvia.
  useEffect(() => {
    if (selectedTemplate) {
      const content = `${selectedTemplate.subject || ''} ${selectedTemplate.body || ''}`;
      const foundVariables = content.match(/\{\{([^}]+)\}\}/g) || [];
      const uniqueVariables = [...new Set(foundVariables.map(v => v.replace(/[{}]/g, '').trim()))];
      setDetectedVariables(uniqueVariables);
    } else {
      setDetectedVariables([]);
    }
  }, [selectedTemplate]);

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