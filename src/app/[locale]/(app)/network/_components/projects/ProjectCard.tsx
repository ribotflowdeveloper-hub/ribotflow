// src/app/[locale]/(app)/network/_components/ProjectCard.tsx

"use client";

import { Briefcase } from 'lucide-react';
import type { JobPostingListItem } from '../../types'; // El nostre nou tipus
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';

interface ProjectCardProps {
    project: JobPostingListItem;
    isSelected: boolean;
    onClick: () => void;
}

export default function ProjectCard({ project, isSelected, onClick }: ProjectCardProps) {
    const t = useTranslations('NetworkPage');
    
    // Obtenim les dades de l'equip (amb valors per defecte)
    // Gràcies al JOIN que vam fer a NetworkData, tenim 'teams'
    const teamName = project.teams?.name ?? t('unknownCompany');
    const teamLogo = project.teams?.logo_url;

    return (
        <div 
            onClick={onClick} 
            className={cn(
                'p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200', 
                isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'bg-card hover:bg-muted'
            )}
        >
            <div className="flex items-center gap-4">
                {/* Logo de l'empresa que publica */}
                {teamLogo ? (
                    <Image 
                        src={teamLogo} 
                        alt={t('logoAltText', { companyName: teamName })} 
                        width={48} 
                        height={48} 
                        className="rounded-full object-cover bg-muted" 
                    />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        {/* Icona de maletí per a projectes */}
                        <Briefcase className="w-6 h-6 text-gray-400" />
                    </div>
                )}
                
                {/* Detalls del projecte */}
                <div className="min-w-0">
                    <h3 className="font-bold truncate" title={project.title}>{project.title}</h3>
                    <p className="text-sm text-primary font-medium truncate">{teamName}</p>
                </div>
            </div>
        </div>
    );
}