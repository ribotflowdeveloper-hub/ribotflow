import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { useTranslations, useLocale } from 'next-intl';
import { type Stage, type OpportunityWithContact } from './PipelineData';
import { PIPELINE_STAGES_MAP } from '@/config/pipeline';
import { OpportunityRowCard } from './OportunityRowCard';

interface RowsViewProps {
  stages: Stage[]; // Ara 'Stage' inclourà la propietat 'color'
  opportunitiesByStage: Record<number, OpportunityWithContact[]>;
  onEditOpportunity: (opportunity: OpportunityWithContact) => void;
  onAddClick: (stageId: number) => void;
}

export const RowsView: React.FC<RowsViewProps> = ({ stages, opportunitiesByStage, onEditOpportunity, onAddClick }) => {
  const t = useTranslations('PipelinePage');
  const locale = useLocale();
  
  // ✅ ELIMINAT: Ja no necessitem el 'stageColors' hardcoded

  return (
    <div className="flex-1 overflow-y-auto pr-2 -mr-4">
      <Accordion type="multiple" defaultValue={stages.map(s => s.id.toString())} className="w-full space-y-4">
        {stages.map(stage => {
          const stageKey = PIPELINE_STAGES_MAP.find(s => s.name === stage.name)?.key;
          const opportunities = opportunitiesByStage[stage.id] || [];
          const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
          return (
            // ✅ CORRECCIÓ: Utilitzem 'style' per al color dinàmic
            <AccordionItem 
              key={stage.id} 
              value={stage.id.toString()} 
              className="bg-muted/20 rounded-xl overflow-hidden border-l-4"
              style={{ borderLeftColor: stage.color || '#808080' }}
            >
              <div className="flex justify-between items-center w-full px-4">
                <AccordionTrigger className="flex-1 text-left py-3 hover:no-underline">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">{stageKey ? t(`stageNames.${stageKey}`) : stage.name}</h3>
                    <p className="text-xs text-muted-foreground text-left">
                      {t('opportunityCount', { count: opportunities.length })} • €{totalValue.toLocaleString(locale)}
                    </p>
                  </div>
                </AccordionTrigger>
                {/* ✅ CORRECCIÓ: Passem l'ID numèric de l'etapa */}
                <Button size="sm" variant="ghost" onClick={() => onAddClick(stage.id)} className="ml-4">
                  <Plus className="w-4 h-4 mr-2" />{t('addOpportunity')}
                </Button>
              </div>
              <AccordionContent className="px-2 pb-2">

                {/* ✅ CORRECCIÓ: El 'droppableId' ha de ser l'ID numèric (com a string) */}
                <Droppable droppableId={stage.id.toString()}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn("space-y-2 p-2 rounded-md transition-colors", snapshot.isDraggingOver ? "bg-primary/5" : "")}>
                      {opportunities.length > 0 ? (
                        opportunities.map((op, index) => (
                          <OpportunityRowCard key={op.id} op={op} index={index} onEdit={onEditOpportunity} />
                        ))
                      ) : (
                        <p className="text-center text-sm text-muted-foreground p-4">{t('noOpportunitiesInStage')}</p>
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};