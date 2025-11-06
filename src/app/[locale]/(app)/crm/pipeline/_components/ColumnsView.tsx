import React from 'react';
import { type Stage, type OpportunityWithContact } from './PipelineData';
import { StageColumn } from './StageColumn';

interface ColumnsViewProps {
  stages: Stage[];
  // ✅ CORRECCIÓ: L'objecte s'indexa per 'number' (stage.id)
  opportunitiesByStage: Record<number, OpportunityWithContact[]>;
  onEditOpportunity: (opportunity: OpportunityWithContact) => void;
  // ✅ CORRECCIÓ: Aquesta funció ara rep un 'number' (stage.id)
  onAddClick: (stageId: number) => void;
}

export const ColumnsView: React.FC<ColumnsViewProps> = ({ stages, opportunitiesByStage, onEditOpportunity, onAddClick }) => {
  return (
    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-0">
      {stages.map(stage => (
        <StageColumn
          key={stage.id}
          stage={stage}
          // ✅ CORRECCIÓ: Accedim per ID
          opportunities={opportunitiesByStage[stage.id] || []}
          onEditOpportunity={onEditOpportunity}
          // ✅ CORRECCIÓ: Passem l'ID
          onAddClick={() => onAddClick(stage.id)}
        />
      ))}
    </div>
  );
};