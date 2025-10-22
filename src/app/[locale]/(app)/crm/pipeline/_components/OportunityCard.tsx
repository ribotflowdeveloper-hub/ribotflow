// /app/[locale]/(app)/crm/pipeline/_components/OportunityCard.tsx

"use client";

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils/utils';
import { User, Euro, Calendar } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { type OpportunityWithContact } from './PipelineData';

interface OpportunityCardProps {
    opportunity: OpportunityWithContact;
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
                        // ✅ Estils Base (Mode Clar): Fons sòlid, ombra lleugera
                        'bg-card p-3 rounded-lg mb-3 border border-border shadow-sm',
                        // ✅ Estils Hover (Mode Clar): Ombra més pronunciada, vora accentuada
                        'hover:shadow-md hover:border-primary/30',
                        // ✅ Estils Mode Fosc: Mantenim el fons semi-transparent original
                        'dark:bg-background/80 dark:backdrop-blur-sm dark:border-transparent dark:shadow-none',
                        // ✅ Estils Hover (Mode Fosc)
                        'dark:hover:border-primary/50',
                        // Estils Draggable (Comuns)
                        'border-l-4 transition-all duration-300 cursor-pointer',
                        snapshot.isDragging
                            ? 'border-primary shadow-2xl dark:shadow-primary/20 scale-105' // Ombra més forta en dark mode
                            : 'border-transparent' // La vora hover ja està gestionada
                    )}
                >
                    <h4 className="font-semibold text-foreground mb-2 text-sm">{opportunity.name}</h4>
                    {opportunity.description && (
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opportunity.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                        <User className="w-4 h-4 text-primary/80" /> {opportunity.contacts?.nom || t('noContact')}
                    </p>
                    {/* ✅ Vora inferior adaptada a light/dark */}
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-border dark:border-white/10 text-xs">
                        {/* ✅ Color verd més fosc per a millor contrast en light mode */}
                        <span className="font-semibold text-emerald-600 dark:text-green-400 flex items-center gap-1">
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