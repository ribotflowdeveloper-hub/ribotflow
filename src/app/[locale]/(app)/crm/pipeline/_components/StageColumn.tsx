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
    stage: Stage;
    opportunities: OpportunityWithContact[];
    onEditOpportunity: (opportunity: OpportunityWithContact) => void;
    onAddClick: () => void;
}

export const StageColumn: React.FC<StageColumnProps> = ({ stage, opportunities, onEditOpportunity, onAddClick }) => {
    const t = useTranslations('PipelinePage');
    const locale = useLocale();
    const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
    const stageKey = PIPELINE_STAGES_MAP.find(s => s.name === stage.name)?.key;
    const stageColors: Record<string, string> = { 'Prospecte': 'border-blue-500', 'Contactat': 'border-cyan-500', 'Proposta Enviada': 'border-purple-500', 'Negociació': 'border-yellow-500', 'Guanyat': 'border-green-500', 'Perdut': 'border-red-500' };

    return (
        // ✅✅ CANVI PRINCIPAL: Ajustem fons i vores per light/dark ✅✅
        <div className={cn(
            "flex flex-col h-full rounded-xl overflow-hidden",
            // Mode Clar: Fons 'card' (blanc/quasi blanc) amb vora
            "bg-card border border-border",
            // Mode Fosc: Mantenim el fons semi-transparent original, sense vora extra
            "dark:bg-muted/20 dark:border-transparent"
        )}>
            <div className={cn('p-4 border-t-4', stageColors[stage.name] || 'border-gray-500')}>
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
            <Droppable droppableId={stage.name}>
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