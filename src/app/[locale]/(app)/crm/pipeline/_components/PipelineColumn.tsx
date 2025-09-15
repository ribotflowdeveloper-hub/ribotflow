/**
 * @file PipelineColumn.tsx
 * @summary Aquest fitxer defineix els components visuals per a la vista de columnes del pipeline.
 * Utilitza la llibreria '@dnd-kit/sortable' per a una funcionalitat de drag-and-drop més avançada.
 * Conté la lògica per renderitzar una columna d'etapa (ex: "Prospecte") i les targetes
 * d'oportunitat individuals que es poden arrossegar.
 */

"use client";

// Imports de la llibreria dnd-kit, una eina potent i accessible per al drag-and-drop a React.
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities'; // Utilitat per aplicar transformacions CSS.

import type { Opportunity, Stage } from '../page';
import { Button } from '@/components/ui/button';
import { Plus, DollarSign, User, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from "date-fns";

/**
 * @summary Renderitza una targeta d'oportunitat individual i la fa "ordenable" (sortable).
 * @param {Opportunity} opportunity - Les dades de l'oportunitat.
 * @param {boolean} [isOverlay] - Un booleà que indica si la targeta s'està renderitzant com un "fantasma" durant l'arrossegament.
 */

// ✅ DISSENY RESTAURAT: Targeta individual per a cada oportunitat
export const OpportunityCard = ({ opportunity, isOverlay }: { opportunity: Opportunity; isOverlay?: boolean; }) => {
        // El hook 'useSortable' de dnd-kit ens proporciona tot el necessari per fer un element arrossegable.

    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
        id: opportunity.id,// L'ID únic de l'element que s'arrossega.
        data: { ...opportunity, type: 'Opportunity' },
    });
    // Dnd-kit recomana aplicar les transformacions (translate) i transicions via CSS per a un millor rendiment.

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
          <div
            ref={setNodeRef} // Ref per connectar el hook amb el node del DOM.
            style={style}
            {...attributes} // Atributs d'accessibilitat.
            {...listeners} // Oients d'esdeveniments (onMouseDown, onKeyDown) per iniciar l'arrossegament.
            className={cn(
                "bg-background/80 backdrop-blur-sm p-3 rounded-lg border-l-4 transition-all duration-300 cursor-grab active:cursor-grabbing",
            // Canviem l'estil si la targeta és l'overlay (el "fantasma" que es mou).
                isOverlay ? "border-primary shadow-2xl shadow-primary/20 scale-105" : "border-transparent hover:border-primary/50"
            )}
        >
            <h4 className="font-semibold text-foreground mb-2 text-sm">{opportunity.name}</h4>
            {opportunity.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opportunity.description}</p>}
            <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary/80"/> {opportunity.contacts?.nom || 'Sense contacte'}
            </p>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-xs">
              <span className="font-semibold text-green-400 flex items-center gap-1">
                <DollarSign className="w-3 h-3"/> {opportunity.value?.toLocaleString('ca-ES') || '0'}
              </span>
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3"/> {opportunity.close_date ? format(new Date(opportunity.close_date), 'dd/MM/yy') : '-'}
              </span>
            </div>
        </div>
    );
};

/**
 * @summary Renderitza una columna completa del pipeline (ex: "Contactat").
 * Aquesta columna actua com a contenidor "ordenable" (on es poden deixar anar targetes).
 */
export const PipelineColumn = ({ stage, opportunities, onAddClick, onCardClick }: {
    stage: Stage;
    opportunities: Opportunity[];
    onAddClick: () => void;
    onCardClick: (opportunity: Opportunity) => void;
}) => {
        // Fem que la columna sencera sigui "ordenable" per si en el futur volem reordenar columnes.

    const { setNodeRef, isOver } = useSortable({
        id: stage.name,
        data: { type: 'Column', stageName: stage.name },
    });
    
    const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
    const stageColors: Record<string, string> = { 
        'Prospecte': 'border-blue-500', 
        'Contactat': 'border-cyan-500', 
        'Proposta Enviada': 'border-purple-500', 
        'Negociació': 'border-yellow-500', 
        'Guanyat': 'border-green-500', 
        'Perdut': 'border-red-500' 
    };

    return (
        <div ref={setNodeRef} className="w-80 flex-shrink-0 h-full flex flex-col bg-muted/20 rounded-xl overflow-hidden">
                        {/* Capçalera de la columna amb títol, comptador i valor total. */}

            <div className={cn("p-4 border-t-4", stageColors[stage.name] || 'border-gray-500')}>
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-lg text-foreground">{stage.name}</h3>
                    <Button variant="ghost" size="icon" onClick={onAddClick} className="w-7 h-7"><Plus className="w-4 h-4" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">{opportunities.length} oportunitat{opportunities.length !== 1 ? 's' : ''} • €{totalValue.toLocaleString('ca-ES')}</p>
            </div>
            <div className={cn(
                "flex-1 px-2 pt-2 overflow-y-auto transition-colors",
                isOver ? 'bg-primary/10' : ''
            )}>
                <SortableContext items={opportunities.map(o => o.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-3">
                        {opportunities.map(op => (
                            <div key={op.id} onDoubleClick={() => onCardClick(op)}>
                               <OpportunityCard opportunity={op} />
                            </div>
                        ))}
                    </div>
                </SortableContext>
            </div>
        </div>
    );
};

