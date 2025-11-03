/**
 * @file TemplateList.tsx
 * @summary Renderitza la columna esquerra amb la llista de plantilles i el botó per crear-ne de noves.
 */
"use client";

import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { EmailTemplate } from '@/types/db';

interface TemplateListProps {
  templates: EmailTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: EmailTemplate) => void;
  onNewTemplate: () => void;
  onSetTemplateToDelete: (template: EmailTemplate) => void;
}

export function TemplateList({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onNewTemplate,
  onSetTemplateToDelete,
}: TemplateListProps) {
  const t = useTranslations('TemplatesPage');

  return (
    <div className="glass-card flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold">{t('templatesListTitle')}</h2>
        <Button size="icon" variant="ghost" onClick={onNewTemplate}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {templates.map(template => (
          <div
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className={`group flex justify-between items-center p-4 cursor-pointer border-l-4 ${
              selectedTemplateId === String(template.id)
                ? 'bg-primary/20 border-primary'
                : 'border-transparent hover:bg-muted'
            }`}
          >
            <p className="font-semibold truncate">{template.name}</p>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation(); // Evitem que el clic seleccioni la plantilla
                onSetTemplateToDelete(template);
              }}
            >
              <Trash2 className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}