"use client";

import React, { useState, useMemo, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileList from './profiles/ProfileList';
import ProjectList from './projects/ProjecteList';
import type { PublicProfileListItem, PublicProfileDetail, JobPostingListItem } from '../types';
import { useTranslations } from 'next-intl';
// ✅ 1. Importem 'Users' per al nou botó "Tots"
import { List, Map as MapIcon, Building2, Briefcase, PlusCircle, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { getTeamDetailsAction } from '../actions';
import { toast } from 'sonner';
import CreateProjectDialog from './CreateProjectDialog'; 
import { useNavigationStore } from '@/stores/navigationStore';

const MapLoadingSkeleton = () => {
    const t = useTranslations('NetworkPage');
    return <div className="w-full h-full bg-muted flex items-center justify-center"><p className="text-muted-foreground">{t('loadingMap')}</p></div>;
};

const DynamicMapContainer = dynamic(() => import('./MapContainer'), { loading: () => <MapLoadingSkeleton />, ssr: false });

const MOBILE_HEADER_HEIGHT_PX = 64;

// ✅ 2. Definim el nou estat unificat
type DisplayMode = 'all' | 'profiles' | 'projects';

export function NetworkClient({
    profiles,
    jobPostings,
    errorMessage
}: {
    profiles: PublicProfileListItem[];
    jobPostings: JobPostingListItem[];
    errorMessage?: string;
}) {
    const [selectedProfile, setSelectedProfile] = useState<PublicProfileListItem | null>(null);
    const [detailedProfile, setDetailedProfile] = useState<PublicProfileDetail | null>(null);
    const [isDetailsLoading, startDetailsTransition] = useTransition();
    const [selectedProject, setSelectedProject] = useState<JobPostingListItem | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    // ✅ 3. Estat unificat per controlar la llista i el mapa.
    const [displayMode, setDisplayMode] = useState<DisplayMode>('all');
    
    const t = useTranslations('NetworkPage');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const { activeTeam } = useNavigationStore();

    const filteredProfiles = useMemo(() => {
        if (!searchTerm) return profiles;
        return profiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [profiles, searchTerm]);

    const filteredJobPostings = useMemo(() => {
        if (!searchTerm) return jobPostings;
        return jobPostings.filter(j =>
            j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.teams?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [jobPostings, searchTerm]);

    const handleSelectProfile = (profile: PublicProfileListItem | null) => {
        setSelectedProject(null);
        setSelectedProfile(profile);
        setDetailedProfile(null);
        if (profile) {
            startDetailsTransition(async () => {
                const result = await getTeamDetailsAction(profile.id);
                if (result.success) {
                    setDetailedProfile(result.data as PublicProfileDetail);
                    setViewMode('map');
                    setDisplayMode('profiles'); // Enfoca el mode a "profiles"
                } else {
                    toast.error("Error en carregar els detalls", { description: result.message });
                    setSelectedProfile(null);
                }
            });
        }
    };

    const handleSelectProject = (project: JobPostingListItem | null) => {
        setSelectedProfile(null);
        setDetailedProfile(null);
        setSelectedProject(project);
        if (project) {
            setViewMode('map');
            setDisplayMode('projects'); // Enfoca el mode a "projects"
        }
    };

    const handleMapDeselect = () => {
        setSelectedProfile(null);
        setDetailedProfile(null);
        setSelectedProject(null);
    }

    // ✅ 4. Actualitzem el gestor del canvi de mode
    const handleChangeDisplayMode = (mode: DisplayMode) => {
        setSearchTerm('');
        handleMapDeselect();
        setDisplayMode(mode);
    }

    if (errorMessage) {
        return <div className="p-8 text-destructive text-center">{errorMessage}</div>;
    }

    return (
        <div className="h-full w-full flex flex-col bg-background overflow-hidden">
            {/* Barra superior Mòbil */}
            <div
                className="p-2 border-b bg-background/95 backdrop-blur-sm lg:hidden flex-shrink-0"
                style={{ height: `${MOBILE_HEADER_HEIGHT_PX}px` }}
            >
                <div className="flex w-full bg-muted p-1 rounded-md h-full">
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} className="flex-1 h-full" onClick={() => setViewMode('list')}>
                        <List className="mr-2 h-5 w-5" /> {t('listView')}
                    </Button>
                    <Button variant={viewMode === 'map' ? 'secondary' : 'ghost'} className="flex-1 h-full" onClick={() => setViewMode('map')}>
                        <MapIcon className="mr-2 h-5 w-5" /> {t('mapView')}
                    </Button>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden min-h-0 p-4 sm:p-6 md:p-8 lg:p-4 lg:grid lg:grid-cols-3 lg:gap-8">
                {/* --- LAYOUT DESKTOP (lg:) --- */}
                <div className="hidden lg:flex lg:flex-col glass-effect rounded-lg overflow-hidden">
                    <div className="p-4 border-b border-border flex-shrink-0">
                        {/* ✅ 5. Canviem a filtre de 3 botons */}
                        <div className="flex w-full bg-muted p-1 rounded-md mb-4">
                            <Button variant={displayMode === 'all' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeDisplayMode('all')}>
                                <Users className="mr-2 h-5 w-5" /> Tots
                            </Button>
                            <Button variant={displayMode === 'profiles' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeDisplayMode('profiles')}>
                                <Building2 className="mr-2 h-5 w-5" /> Professionals
                            </Button>
                            <Button variant={displayMode === 'projects' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeDisplayMode('projects')}>
                                <Briefcase className="mr-2 h-5 w-5" /> Projectes
                            </Button>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {/* ✅ 6. Actualitzem el títol */}
                                {displayMode === 'projects' ? "Projectes Oberts" : t('networkTitle')}
                            </h2>
                            {/* Mostrem el botó "Publicar" només si estem a la vista de projectes */}
                            {displayMode === 'projects' && activeTeam && (
                                <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Publicar
                                </Button>
                            )}
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                            <input
                                type="text"
                                // ✅ 7. Actualitzem el placeholder
                                placeholder={displayMode === 'projects' ? "Cercar projectes..." : t('searchPlaceholder')}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>
                    
                    {/* ✅ 8. Lògica de renderitzat de llista actualitzada */}
                    {displayMode === 'projects' ? (
                        <ProjectList
                            projects={filteredJobPostings}
                            onSelectProject={handleSelectProject}
                            selectedProjectId={selectedProject?.id}
                            className="flex-1"
                        />
                    ) : (
                        // "Tots" i "Professionals" mostren la llista de professionals
                        <ProfileList
                            profiles={filteredProfiles}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            onSelectProfile={handleSelectProfile}
                            selectedProfileId={selectedProfile?.id}
                            className="flex-1"
                        />
                    )}
                </div>

                {/* --- MAPA DESKTOP --- */}
                {/* ✅ 9. Tornem el mapa al seu lloc original i passem 'displayMode' */}
                <div className="hidden lg:block lg:col-span-2 rounded-lg overflow-hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        jobPostings={filteredJobPostings}
                        displayMode={displayMode}
                        selectedProfile={selectedProfile}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                        selectedProject={selectedProject}
                        onSelectProfile={handleSelectProfile}
                        onSelectProject={handleSelectProject}
                    />
                </div>

                {/* --- LAYOUT MÒBIL (default) --- */}
                {/* ✅ 10. Traiem el filtre superposat del mapa */}
                <div className="absolute inset-0 h-full w-full lg:hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        jobPostings={filteredJobPostings}
                        displayMode={displayMode}
                        selectedProfile={selectedProfile}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                        selectedProject={selectedProject}
                        onSelectProfile={handleSelectProfile}
                        onSelectProject={handleSelectProject}
                    />
                </div>

                {/* Llista Mòbil (Panell animat) */}
                <AnimatePresence>
                    {viewMode === 'list' && (
                        <motion.div
                            key="panel-mobile"
                            className={cn(
                                "absolute inset-0 z-10 bg-background shadow-lg",
                                "lg:hidden",
                                "flex flex-col"
                            )}
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                        >
                            <div className="p-4 border-b border-border flex-shrink-0">
                                {/* ✅ 11. Canviem a filtre de 3 botons (mòbil) */}
                                <div className="flex w-full bg-muted p-1 rounded-md mb-4">
                                    <Button variant={displayMode === 'all' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeDisplayMode('all')}>
                                        <Users className="mr-2 h-5 w-5" /> Tots
                                    </Button>
                                    <Button variant={displayMode === 'profiles' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeDisplayMode('profiles')}>
                                        <Building2 className="mr-2 h-5 w-5" /> Professionals
                                    </Button>
                                    <Button variant={displayMode === 'projects' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeDisplayMode('projects')}>
                                        <Briefcase className="mr-2 h-5 w-5" /> Projectes
                                    </Button>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">
                                        {displayMode === 'projects' ? "Projectes Oberts" : t('networkTitle')}
                                    </h2>
                                    {displayMode === 'projects' && activeTeam && (
                                        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Publicar
                                        </Button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder={displayMode === 'projects' ? "Cercar projectes..." : t('searchPlaceholder')}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* ✅ 12. Lògica de renderitzat de llista actualitzada (mòbil) */}
                            {displayMode === 'projects' ? (
                                <ProjectList
                                    projects={filteredJobPostings}
                                    onSelectProject={handleSelectProject}
                                    selectedProjectId={selectedProject?.id}
                                    className="flex-1"
                                />
                            ) : (
                                <ProfileList
                                    profiles={filteredProfiles}
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
                                    onSelectProfile={handleSelectProfile}
                                    selectedProfileId={selectedProfile?.id}
                                    className="flex-1"
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {activeTeam && (
                    <CreateProjectDialog
                        open={isCreateDialogOpen}
                        onOpenChange={setIsCreateDialogOpen}
                        teamId={activeTeam.id}
                    />
                )}
            </div>
        </div>
    );
}