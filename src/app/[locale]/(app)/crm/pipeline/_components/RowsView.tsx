/**
 * @file RowsView.tsx
 * @summary Component que renderitza la vista de files (acordió) del pipeline.
 */
"use client";

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import type { Stage, Opportunity } from '../page';
import { PIPELINE_STAGES_MAP } from '@/types/crm';
import { OpportunityRowCard } from './OportunityRowCard';

interface RowsViewProps {
  stages: Stage[];
  opportunitiesByStage: Record<string, Opportunity[]>;
  onEditOpportunity: (opportunity: Opportunity) => void;
  onAddClick: (stageName: string) => void;
}

export const RowsView: React.FC<RowsViewProps> = ({ stages, opportunitiesByStage, onEditOpportunity, onAddClick }) => {
    const t = useTranslations('PipelinePage');
    const locale = useLocale();
    const stageColors: Record<string, string> = { 'Prospecte': 'border-blue-500', 'Contactat': 'border-cyan-500', 'Proposta Enviada': 'border-purple-500', 'Negociació': 'border-yellow-500', 'Guanyat': 'border-green-500', 'Perdut': 'border-red-500' };

    return (
        <div className="flex-1 overflow-y-auto pr-2 -mr-4">
            <Accordion type="multiple" defaultValue={stages.map(s => s.id)} className="w-full space-y-4">
                {stages.map(stage => {
                    const stageKey = PIPELINE_STAGES_MAP.find(s => s.name === stage.name)?.key;
                    const opportunities = opportunitiesByStage[stage.name] || [];
                    const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
                    return (
                        <AccordionItem key={stage.id} value={stage.id} className={cn("bg-muted/20 rounded-xl overflow-hidden border-l-4", stageColors[stage.name] || "border-gray-500")}>
                            <div className="flex justify-between items-center w-full px-4">
                                <AccordionTrigger className="flex-1 text-left py-3 hover:no-underline">
                                    <div>
                                        <h3 className="font-bold text-lg text-foreground">{stageKey ? t(`stageNames.${stageKey}`) : stage.name}</h3>
                                        <p className="text-xs text-muted-foreground text-left">
                                            {t('opportunityCount', { count: opportunities.length })} • €{totalValue.toLocaleString(locale)}
                                        </p>
                                    </div>
                                </AccordionTrigger>
                                <Button size="sm" variant="ghost" onClick={() => onAddClick(stage.name)} className="ml-4">
                                    <Plus className="w-4 h-4 mr-2" />{t('addOpportunity')}
                                </Button>
                            </div>
                            <AccordionContent className="px-2 pb-2">
                                <Droppable droppableId={stage.name}>
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