import React from 'react';
import { type Stage, type OpportunityWithContact } from './PipelineData';
import { StageColumn } from './StageColumn';

interface ColumnsViewProps {
  stages: Stage[];
  opportunitiesByStage: Record<string, OpportunityWithContact[]>;
  onEditOpportunity: (opportunity: OpportunityWithContact) => void;
  onAddClick: (stageName: string) => void;
}

export const ColumnsView: React.FC<ColumnsViewProps> = ({ stages, opportunitiesByStage, onEditOpportunity, onAddClick }) => {
    return (
        //console.log("Renderitzant ColumnsView amb etapes:", stages),
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 min-h-0">
            {stages.map(stage => (
                <StageColumn
                    key={stage.id}
                    stage={stage}
                    opportunities={opportunitiesByStage[stage.name] || []}
                    onEditOpportunity={onEditOpportunity}
                    onAddClick={() => onAddClick(stage.name)}
                />
            ))}
        </div>
    );
};