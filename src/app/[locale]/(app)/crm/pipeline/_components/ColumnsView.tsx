/**
 * @file ColumnsView.tsx
 * @summary Component que renderitza la vista de columnes del pipeline.
 */
"use client";

import React from 'react';
import type { Stage, Opportunity } from '../page';
import { StageColumn } from './StageColumn';

interface ColumnsViewProps {
  stages: Stage[];
  opportunitiesByStage: Record<string, Opportunity[]>;
  onEditOpportunity: (opportunity: Opportunity) => void;
  onAddClick: (stageName: string) => void;
}

export const ColumnsView: React.FC<ColumnsViewProps> = ({ stages, opportunitiesByStage, onEditOpportunity, onAddClick }) => {
    return (
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