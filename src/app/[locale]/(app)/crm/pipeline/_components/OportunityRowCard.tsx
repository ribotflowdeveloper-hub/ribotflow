import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { cn } from '@/lib/utils/utils';
import { User, Euro, Calendar } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { type OpportunityWithContact } from './PipelineData';

interface OpportunityRowCardProps {
  op: OpportunityWithContact;
  index: number;
  onEdit: (op: OpportunityWithContact) => void;
}

export const OpportunityRowCard: React.FC<OpportunityRowCardProps> = ({ op, index, onEdit }) => {
    const t = useTranslations('PipelinePage');
    const locale = useLocale();

    return (
        <Draggable draggableId={op.id.toString()} index={index}>
            {(provided, snapshot) => (
                <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    onDoubleClick={() => onEdit(op)}
                    className={cn(
                        "grid grid-cols-2 md:grid-cols-5 gap-4 px-4 py-3 items-center rounded-lg bg-card shadow-md transition-all cursor-pointer",
                        "hover:shadow-lg hover:scale-[1.01]",
                        snapshot.isDragging ? "border-l-4 border-primary shadow-xl" : "border-l-4 border-transparent"
                    )}
                >
                    <div className="font-semibold text-base text-foreground col-span-2">{op.name}</div>
                    <div className="flex items-center text-sm text-foreground">
                        <User className="w-4 h-4 mr-2 text-primary" />
                        {op.contacts?.nom || t('noContact')}
                    </div>
                    <div className="flex items-center text-sm font-medium text-green-600">
                        <Euro className="w-4 h-4 mr-2" />
                        {op.value?.toLocaleString(locale) || "0"} €
                    </div>
                    <div className="flex justify-end items-center text-xs text-muted-foreground gap-2">
                        <Calendar className="w-3 h-3" />
                        {op.close_date ? new Date(op.close_date).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }) : "-"}
                    </div>
                </div>
            )}
        </Draggable>
    );
};