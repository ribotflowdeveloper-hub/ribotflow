/**
 * @file OpportunityCard.tsx
 * @summary Renderitza una targeta d'oportunitat per a la vista de columnes.
 */
"use client";

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils/utils';
import { User, Euro, Calendar } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import type { Opportunity } from '../page';

interface OpportunityCardProps {
  opportunity: Opportunity;
  index: number;
}

export const OpportunityCard: React.FC<OpportunityCardProps> = ({ opportunity, index }) => {
    const t = useTranslations('PipelinePage');
    const locale = useLocale();

    return (
        <Draggable draggableId={opportunity.id.toString()} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={cn(
                        'bg-background/80 backdrop-blur-sm p-3 rounded-lg mb-3 border-l-4 transition-all duration-300 cursor-pointer',
                        snapshot.isDragging ? 'border-primary shadow-2xl shadow-primary/20 scale-105' : 'border-transparent hover:border-primary/50'
                    )}
                >
                    <h4 className="font-semibold text-foreground mb-2 text-sm">{opportunity.name}</h4>
                    {opportunity.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opportunity.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-primary/80" /> {opportunity.contacts?.nom || t('noContact')}
                    </p>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-xs">
                        <span className="font-semibold text-green-400 flex items-center gap-1">
                            <Euro className="w-3 h-3" /> {opportunity.value?.toLocaleString(locale) || '0'}
                        </span>
                        <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />{' '}
                            {opportunity.close_date ? new Date(opportunity.close_date).toLocaleDateString(locale, { day: '2-digit', month: '2-digit' }) : '-'}
                        </span>
                    </div>
                </div>
            )}
        </Draggable>
    );
};