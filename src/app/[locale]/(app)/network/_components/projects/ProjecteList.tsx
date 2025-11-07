import type { MapJobPosting } from '../../types'; // ✅ Canviat a MapJobPosting
import ProjectCard from './ProjectCard'; 
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';

interface ProjectListProps {
    projects: MapJobPosting[]; // ✅ Canviat a MapJobPosting
    onSelectProject: (project: MapJobPosting | null) => void; // ✅ Canviat a MapJobPosting
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
        <div className={cn("flex-1 overflow-y-auto custom-scrollbar p-2", className)}>
            {projects.length > 0 ? (
                projects.map(project => (
                    <ProjectCard
                        key={project.id}
                        // ✅ El component ProjectCard ha d'acceptar MapJobPosting
                        // o adaptem les dades. Assumim que ProjectCard espera
                        // 'JobPostingListItem'
                        project={{
                           id: project.id,
                           title: project.title,
                           latitude: project.latitude,
                           longitude: project.longitude,
                           address_text: null, // MapJobPosting no té address_text
                           team_id: project.team_id,
                           teams: project.teams
                        }}
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