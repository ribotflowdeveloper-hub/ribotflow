// /src/app/[locale]/(app)/comunicacio/templates/_components/TemplateList.tsx (FITXER CORREGIT)
/**
 * @file TemplateList.tsx
 * @summary Renderitza la columna esquerra amb la llista de plantilles i el botó per crear-ne de noves.
 */
"use client";

import { Button } from '@/components/ui/button';
import { Plus, Trash2, Lock } from 'lucide-react'; // ✅ 1. Importem 'Lock'
import { useTranslations } from 'next-intl';
import type { EmailTemplate } from '@/types/db';
import { type UsageCheckResult } from '@/lib/subscription/subscription'; // ✅ 2. Importem el tipus de límit
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // ✅ 3. Importem Tooltip
import Link from 'next/link';

interface TemplateListProps {
  templates: EmailTemplate[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: EmailTemplate) => void;
  onNewTemplate: () => void;
  onSetTemplateToDelete: (template: EmailTemplate) => void;
  limitStatus: UsageCheckResult; // ✅ 4. Afegim la prop que faltava
}

export function TemplateList({
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onNewTemplate,
  onSetTemplateToDelete,
  limitStatus, // ✅ 5. Extraiem la prop
}: TemplateListProps) {
  const t = useTranslations('TemplatesPage');
  const t_billing = useTranslations('Billing'); // Per als missatges de límit

  // ✅ 6. Calculem si el límit s'ha assolit
  const isLimitReached = !limitStatus.allowed;

  return (
    <div className="glass-card flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border flex justify-between items-center">
        <h2 className="font-semibold">{t('templatesListTitle')}</h2>
        
        {/* ✅ 7. Botó "Nou" amb control de límit */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={isLimitReached ? 0 : -1}>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={onNewTemplate}
                  disabled={isLimitReached}
                >
                  {isLimitReached ? <Lock className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </Button>
              </span>
              
            </TooltipTrigger>
            {isLimitReached && (
              <TooltipContent className="max-w-xs p-3 shadow-lg rounded-lg border-2 border-yellow-400 bg-yellow-50">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Lock className="w-4 h-4 text-yellow-900" />
                    <h3 className="font-semibold text-black">{t_billing('limitReachedTitle')}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {limitStatus.error || t_billing('limitReachedDefault')}
                  </p>
                  <Button asChild size="sm" className="mt-1 w-full">
                    <Link href="/settings/billing">{t_billing('upgradePlan')}</Link>
                  </Button>
                </div>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
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
                e.stopPropagation(); 
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