import React from 'react';
import { Draggable } from 'react-beautiful-dnd';
import { User, Euro, Calendar } from 'lucide-react';

// NOU: Afegim la propietat 'onEdit'
const OpportunityCard = ({ opportunity, index, onEdit }) => {
  return (
    <Draggable draggableId={opportunity.id.toString()} index={index}>
      {(provided, snapshot) => (
        <div
          // NOU: Afegim l'esdeveniment onDoubleClick
          onDoubleClick={() => onEdit(opportunity)}
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          className={`bg-background/80 backdrop-blur-sm p-3 rounded-lg mb-3 border-l-4 transition-all duration-300 cursor-pointer ${snapshot.isDragging ? 'border-primary shadow-2xl shadow-primary/20 scale-105' : 'border-transparent hover:border-primary/50'}`}
        >
          <h4 className="font-semibold text-foreground mb-2 text-sm">{opportunity.name}</h4>
          {opportunity.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{opportunity.description}</p>}
          <p className="text-xs text-muted-foreground flex items-center gap-2 mb-2"><User className="w-4 h-4 text-primary/80"/> {opportunity.contacts?.nom || 'Sense contacte'}</p>
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-white/5 text-xs">
            <span className="font-semibold text-green-400 flex items-center gap-1"><Euro className="w-3 h-3"/> {opportunity.value?.toLocaleString() || '0'}</span>
            <span className="text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> {opportunity.close_date ? new Date(opportunity.close_date).toLocaleDateString('ca-ES') : '-'}</span>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default OpportunityCard;