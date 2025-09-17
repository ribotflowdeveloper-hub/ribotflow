/**
 * @file PipelineSkeleton.tsx
 * @summary Mostra un esquelet de càrrega per a la pàgina del pipeline.
 */
"use client";

import React from 'react';
import type { Stage } from '../page';

interface PipelineSkeletonProps {
  stages: Stage[];
  viewMode: 'columns' | 'rows';
}

export const PipelineSkeleton: React.FC<PipelineSkeletonProps> = ({ stages, viewMode }) => {
    if (viewMode === 'rows') {
        return (
            <div className="flex-1 overflow-y-auto pr-2 -mr-4 space-y-4">
                {stages.map(stage => (
                    <div key={stage.id} className="bg-muted/20 rounded-xl overflow-hidden border-l-4 border-gray-700">
                        <div className="flex justify-between items-center w-full px-4 py-3">
                            <div>
                                <div className="bg-gray-700/50 h-6 w-32 rounded-md animate-pulse"></div>
                                <div className="bg-gray-700/50 h-4 w-48 rounded-md mt-2 animate-pulse"></div>
                            </div>
                            <div className="bg-gray-700/50 h-9 w-24 rounded-md animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="flex-1 grid grid-cols-6 gap-4 min-h-0">
            {stages.map(stage => (
                <div key={stage.id} className="flex flex-col h-full bg-muted/20 rounded-xl overflow-hidden">
                    <div className="p-4 border-t-4 border-gray-700">
                        <div className="flex justify-between items-center">
                            <div className="bg-gray-700/50 h-6 w-3/4 rounded-md animate-pulse"></div>
                            <div className="bg-gray-700/50 h-7 w-7 rounded-md animate-pulse"></div>
                        </div>
                        <div className="bg-gray-700/50 h-4 w-1/2 rounded-md mt-2 animate-pulse"></div>
                    </div>
                    <div className="flex-1 px-2 pt-2 space-y-3">
                        <div className="bg-background/80 h-24 rounded-lg animate-pulse"></div>
                        <div className="bg-background/80 h-20 rounded-lg animate-pulse"></div>
                    </div>
                </div>
            ))}
        </div>
    );
};