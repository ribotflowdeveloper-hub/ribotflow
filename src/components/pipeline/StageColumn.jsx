import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import OpportunityCard from './OpportunityCard';

// MODIFICAT: Afegim 'onEditOpportunity' a les props que rep el component
const StageColumn = ({ stage, opportunities, onEditOpportunity }) => {
  const totalValue = opportunities.reduce((sum, op) => sum + (op.value || 0), 0);
  const stageColors = { 'Prospecte': 'border-blue-500', 'Contactat': 'border-cyan-500', 'Proposta Enviada': 'border-purple-500', 'Negociació': 'border-yellow-500', 'Guanyat': 'border-green-500', 'Perdut': 'border-red-500' };

  return (
    <div className="flex-[1_0_100%] sm:flex-[1_0_50%] md:flex-[1_0_33.33%] lg:flex-[1_0_25%] xl:flex-[1_0_20%] 2xl:flex-[1_0_16.66%] flex flex-col h-full">
      <div className={`p-4 rounded-t-xl bg-muted/20 border-t-4 ${stageColors[stage.name] || 'border-gray-500'}`}>
        <h3 className="font-bold text-lg text-foreground mb-1">{stage.name}</h3>
        <p className="text-xs text-muted-foreground">
          {opportunities.length} oportunitat{opportunities.length !== 1 ? 's' : ''} • €{totalValue.toLocaleString()}
        </p>
      </div>
      <Droppable droppableId={stage.name}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 px-2 pt-2 rounded-b-xl bg-muted/20 overflow-y-auto transition-colors ${snapshot.isDraggingOver ? 'bg-primary/10' : ''}`}
          >
            <div className="h-2"></div>
            {opportunities.map((op, index) => (
              // Ara 'onEditOpportunity' existeix i es pot passar correctament
              <OpportunityCard 
                  key={op.id} 
                  opportunity={op} 
                  index={index} 
                  onEdit={onEditOpportunity} 
              />
            ))}
            {provided.placeholder}
            <div className="h-2"></div> 
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default StageColumn;