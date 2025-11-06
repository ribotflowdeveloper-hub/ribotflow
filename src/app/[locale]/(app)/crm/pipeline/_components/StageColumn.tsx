import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/utils';
import { Plus } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { type Stage, type OpportunityWithContact } from './PipelineData';
import { PIPELINE_STAGES_MAP } from '@/config/pipeline';
import { OpportunityCard } from './OportunityCard';

interface StageColumnProps {
  stage: Stage; // Ara 'Stage' inclourà la propietat 'color' de la BBDD
  opportunities: OpportunityWithContact[];
  onEditOpportunity: (opportunity: OpportunityWithContact) => void;
  onAddClick: () => void;
}

export const StageColumn: React.FC<StageColumnProps> = ({ stage, opportunities, onEditOpportunity, onAddClick }) => {
  const t = useTranslations('PipelinePage');
  const locale = useLocale();
  const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
  const stageKey = PIPELINE_STAGES_MAP.find(s => s.name === stage.name)?.key;
  
  // ✅ ELIMINAT: Ja no necessitem el 'stageColors' hardcoded

  return (
    <div className={cn(
      "flex flex-col h-full rounded-xl overflow-hidden",
      "bg-card border border-border",
      "dark:bg-muted/20 dark:border-transparent"
    )}>
      {/* ✅ CORRECCIÓ: Utilitzem 'style' per al color dinàmic */}
      <div 
        className="p-4 border-t-4"
        style={{ borderTopColor: stage.color || '#808080' }}
      >
        <div className="flex justify-between items-center">
          <h3 className="font-bold text-lg text-foreground mb-1">{stageKey ? t(`stageNames.${stageKey}`) : stage.name}</h3>
          <Button variant="ghost" size="icon" onClick={onAddClick} className="w-7 h-7">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {t('opportunityCount', { count: opportunities.length })} • €{totalValue.toLocaleString(locale)}
        </p>
      </div>
      
      {/* ✅ CORRECCIÓ: El 'droppableId' ha de ser l'ID numèric de l'etapa */}
      <Droppable droppableId={stage.id.toString()}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn('flex-1 px-2 pt-2 overflow-y-auto transition-colors', snapshot.isDraggingOver ? 'bg-primary/10' : '')}
          >
            {opportunities.map((op, index) => (
              <div key={op.id} onDoubleClick={() => onEditOpportunity(op)}>
                <OpportunityCard opportunity={op} index={index} />
              </div>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};