// src/app/[locale]/(app)/network/_components/ProjectList.tsx

import type { JobPostingListItem } from '../../types';
// ✅ CORRECCIÓ: Importem 'ProjectCard', no 'ProfileCard'
import ProjectCard from './ProjectCard'; 
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';

interface ProjectListProps {
    projects: JobPostingListItem[];
    onSelectProject: (project: JobPostingListItem | null) => void;
    selectedProjectId?: string;
    className?: string; 
}

export default function ProjectList({
    projects,
    onSelectProject,
    selectedProjectId,
    className
}: ProjectListProps) {
    const t = useTranslations('NetworkPage');
    
    return (
        // Aquest component només gestiona la llista i l'scroll
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar p-2", className)}>
            {projects.length > 0 ? (
                projects.map(project => (
                    // Ara 'ProjectCard' és el component correcte
                    <ProjectCard
                        key={project.id}
                        project={project}
                        isSelected={project.id === selectedProjectId}
                        onClick={() => onSelectProject(project)}
                    />
                ))
            ) : (
                <p className="text-center text-muted-foreground p-4">{t('noResults')}</p>
            )}
        </div>
    );
}