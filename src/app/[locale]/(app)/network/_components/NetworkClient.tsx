"use client";

import React, { useState, useMemo, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
// Canviem els imports de les llistes (suposant que són a subdirectoris)
import ProfileList from './profiles/ProfileList';
import ProjectList from './projects/ProjecteList';
import type { MapTeam, MapJobPosting, PublicProfileDetail, PublicJobPostingDetail } from '../types';
import { useTranslations } from 'next-intl';
import { List, Map as MapIcon, Building2, Briefcase, PlusCircle, Search, Users } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
//
// ✅ 1. CANVI CLAU: Importem les accions PÚBLIQUES
//
import { getPublicTeamDetailsAction, getPublicJobPostingDetailsAction, getTeamDetailsAction } from '../actions';
import { toast } from 'sonner';
// Suposo que aquest component existeix
import CreateProjectDialog from './CreateProjectDialog';

const MapLoadingSkeleton = () => {
    const t = useTranslations('NetworkPage');
    return <div className="w-full h-full bg-muted flex items-center justify-center"><p className="text-muted-foreground">{t('loadingMap')}</p></div>;
};

// Suposo que el MapContainer és a _components
const DynamicMapContainer = dynamic(() => import('./MapContainer'), { loading: () => <MapLoadingSkeleton />, ssr: false });

const MOBILE_HEADER_HEIGHT_PX = 64;

type DisplayMode = 'all' | 'profiles' | 'projects';

export function NetworkClient({
    initialTeams,
    initialJobs,
    userTeamId,
    errorMessage
}: {
    initialTeams: MapTeam[];
    initialJobs: MapJobPosting[];
    userTeamId: string | null;
    errorMessage?: string;
}) {
    const [selectedProfile, setSelectedProfile] = useState<MapTeam | null>(null);
    const [detailedProfile, setDetailedProfile] = useState<PublicProfileDetail | null>(null);
    const [isDetailsLoading, startDetailsTransition] = useTransition();

    const [selectedProject, setSelectedProject] = useState<MapJobPosting | null>(null);
    const [detailedProject, setDetailedProject] = useState<PublicJobPostingDetail | null>(null);
    const [isProjectDetailsLoading, startProjectDetailsTransition] = useTransition();

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [displayMode, setDisplayMode] = useState<DisplayMode>('all');

    const t = useTranslations('NetworkPage');
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const canCreateProject = !!userTeamId;

    const filteredProfiles = useMemo(() => {
        console.log(`[NetworkClient] Filtrant ${initialTeams.length} equips amb el terme: "${searchTerm}"`);
        if (!searchTerm) return initialTeams;
        return initialTeams.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [initialTeams, searchTerm]);

    const filteredJobPostings = useMemo(() => {
        console.log(`[NetworkClient] Filtrant ${initialJobs.length} projectes amb el terme: "${searchTerm}"`);
        if (!searchTerm) return initialJobs;
        return initialJobs.filter(j =>
            j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            j.teams?.name?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [initialJobs, searchTerm]);

    const handleSelectProfile = (profile: MapTeam | null) => {
        console.log("[NetworkClient] handleSelectProfile:", profile?.id || "null");
        setSelectedProject(null);
        setDetailedProject(null);
        setSelectedProfile(profile);
        setDetailedProfile(null);

        if (profile) {
            startDetailsTransition(async () => {
                //
                // ✅ LÒGICA DE DECISIÓ
                // Comprovem si el 'userTeamId' (passat com a prop) 
                // coincideix amb el perfil seleccionat.
                //
                const isOwnProfile = userTeamId === profile.id;

                console.log(`[NetworkClient] Carregant detalls. isOwnProfile: ${isOwnProfile}`);

                // Si és el seu perfil, cridem l'acció PRIVADA
                // Si és un altre perfil, cridem la PÚBLICA
                const actionToCall = isOwnProfile
                    ? getTeamDetailsAction
                    : getPublicTeamDetailsAction;

                const result = await actionToCall(profile.id);

                if (result.success) {
                    setDetailedProfile(result.data as PublicProfileDetail);
                    setViewMode('map');
                    setDisplayMode('profiles');
                } else {
                    toast.error("Error en carregar els detalls", { description: result.message });
                    setSelectedProfile(null);
                }
            });
        }
    };

    const handleSelectProject = (project: MapJobPosting | null) => {
        console.log("[NetworkClient] handleSelectProject:", project?.id || "null");
        setSelectedProfile(null);
        setDetailedProfile(null);
        setSelectedProject(project);
        setDetailedProject(null);
        if (project) {
            setViewMode('map');
            setDisplayMode('projects');
            startProjectDetailsTransition(async () => {
                //
                // ✅ 3. CANVI CLAU: Cridem l'acció PÚBLICA
                //
                const result = await getPublicJobPostingDetailsAction(project.id);
                if (result.success) {
                    setDetailedProject(result.data as PublicJobPostingDetail);
                } else {
                    toast.error("Error en carregar detalls del projecte", { description: result.message });
                    setSelectedProject(null);
                }
            });
        }
    };

    const handleMapDeselect = () => {
        console.log("[NetworkClient] handleMapDeselect");
        setSelectedProfile(null);
        setDetailedProfile(null);
        setSelectedProject(null);
        setDetailedProject(null);
    }

    const handleChangeDisplayMode = (mode: DisplayMode) => {
        console.log("[NetworkClient] handleChangeDisplayMode:", mode);
        setSearchTerm('');
        handleMapDeselect();
        setDisplayMode(mode);
    }

    if (errorMessage) {
        return <div className="p-8 text-destructive text-center">{errorMessage}</div>;
    }

    console.log(`[NetworkClient] Renderitzant. Mode Vista: ${viewMode}, Mode Dades: ${displayMode}`);

    return (
        <div className="h-full w-full flex flex-col bg-background overflow-hidden">
            {/* Capçalera mòbil */}
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
                    {/* Filtres de llista i cerca */}
                    <div className="p-4 border-b border-border flex-shrink-0">
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
                            {displayMode === 'projects' && canCreateProject && (
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

                    {/* Llistes Desktop */}
                    {(displayMode === 'all' || displayMode === 'profiles') ? (
                        <ProfileList
                            profiles={filteredProfiles}
                            onSelectProfile={handleSelectProfile}
                            selectedProfileId={selectedProfile?.id}
                            className="flex-1"
                        />
                    ) : (
                        <ProjectList
                            projects={filteredJobPostings}
                            onSelectProject={handleSelectProject}
                            selectedProjectId={selectedProject?.id}
                            className="flex-1"
                        />
                    )}
                </div>

                {/* --- MAPA DESKTOP --- */}
                <div className="hidden lg:block lg:col-span-2 rounded-lg overflow-hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        jobPostings={filteredJobPostings}
                        displayMode={displayMode}
                        selectedProfile={selectedProfile}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                        selectedProject={selectedProject}
                        detailedProject={detailedProject}
                        isProjectLoading={isProjectDetailsLoading}
                        onSelectProfile={handleSelectProfile}
                        onSelectProject={handleSelectProject}
                        onDeselect={handleMapDeselect}
                    />
                </div>

                {/* --- LAYOUT MÒBIL (default) --- */}
                <div className="absolute inset-0 h-full w-full lg:hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        jobPostings={filteredJobPostings}
                        displayMode={displayMode}
                        selectedProfile={selectedProfile}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                        selectedProject={selectedProject}
                        detailedProject={detailedProject}
                        isProjectLoading={isProjectDetailsLoading}
                        onSelectProfile={handleSelectProfile}
                        onSelectProject={handleSelectProject}
                        onDeselect={handleMapDeselect}
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
                                    {displayMode === 'projects' && canCreateProject && (
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

                            {/* Llistes Mòbil */}
                            {(displayMode === 'all' || displayMode === 'profiles') ? (
                                <ProfileList
                                    profiles={filteredProfiles}
                                    onSelectProfile={handleSelectProfile}
                                    selectedProfileId={selectedProfile?.id}
                                    className="flex-1"
                                />
                            ) : (
                                <ProjectList
                                    projects={filteredJobPostings}
                                    onSelectProject={handleSelectProject}
                                    selectedProjectId={selectedProject?.id}
                                    className="flex-1"
                                />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {canCreateProject && userTeamId && (
                    <CreateProjectDialog
                        open={isCreateDialogOpen}
                        onOpenChange={setIsCreateDialogOpen}
                        teamId={userTeamId}
                    />
                )}
            </div>
        </div>
    );
}