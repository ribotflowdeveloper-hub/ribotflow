// src/app/[locale]/(app)/network/_components/NetworkClient.tsx

"use client";

import React, { useState, useMemo, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileList from './ProfileList';
// ✅ 1. CORRECCIÓ: Importem el component correcte
import ProjectList from './ProjecteList';
import type { PublicProfileListItem, PublicProfileDetail, JobPostingListItem } from '../types';
import { useTranslations } from 'next-intl';
import { List, Map as MapIcon, Building2, Briefcase, PlusCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { getTeamDetailsAction } from '../actions';
import { toast } from 'sonner';
import CreateProjectDialog from './CreateProjectDialog'; // El nostre nou component
import { useNavigationStore } from '@/stores/navigationStore';
const MapLoadingSkeleton = () => {
    const t = useTranslations('NetworkPage');
    return <div className="w-full h-full bg-muted flex items-center justify-center"><p className="text-muted-foreground">{t('loadingMap')}</p></div>;
};

const DynamicMapContainer = dynamic(() => import('./MapContainer'), { loading: () => <MapLoadingSkeleton />, ssr: false });

const MOBILE_HEADER_HEIGHT_PX = 64;

export function NetworkClient({
    profiles,
    jobPostings,
    errorMessage
}: {
    profiles: PublicProfileListItem[];
    jobPostings: JobPostingListItem[];
    errorMessage?: string;
}) {
    // --- ESTATS ---
    const [selectedProfile, setSelectedProfile] = useState<PublicProfileListItem | null>(null);
    const [detailedProfile, setDetailedProfile] = useState<PublicProfileDetail | null>(null);
    const [isDetailsLoading, startDetailsTransition] = useTransition();

    const [selectedProject, setSelectedProject] = useState<JobPostingListItem | null>(null);

    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

    const [searchMode, setSearchMode] = useState<'profiles' | 'projects'>('profiles');

    const t = useTranslations('NetworkPage');
    // ✅ NOU ESTAT PER AL DIALOG
    // ✅ NOU ESTAT PER AL DIALOG
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

    // ✅ Obtenim l'equip actiu de l'usuari
    const { activeTeam } = useNavigationStore();



    // --- MEMOS PER FILTRAR LLISTES ---
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


    // --- GESTORS D'ESDEVENIMENTS ---

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
            // TODO: 'getJobPostingDetailsAction(project.id)'
            setViewMode('map');
        }
    };

    const handleMapDeselect = () => {
        setSelectedProfile(null);
        setDetailedProfile(null);
        setSelectedProject(null);
    }

    const handleChangeSearchMode = (mode: 'profiles' | 'projects') => {
        setSearchTerm('');
        handleMapDeselect();
        setSearchMode(mode);
    }

    // --- RENDER ---

    if (errorMessage) {
        return <div className="p-8 text-destructive text-center">{errorMessage}</div>;
    }

    return (
        <div className="h-screen w-full flex flex-col bg-background overflow-hidden">

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

            {/* Àrea de Contingut Principal */}
            <div className="flex-1 relative overflow-hidden lg:grid lg:grid-cols-3 lg:gap-8 lg:p-4">

                {/* --- LAYOUT DESKTOP (lg:) --- */}

                {/* Llista Desktop */}
                <div className="hidden lg:flex lg:flex-col glass-effect rounded-lg overflow-hidden">

                    <div className="p-4 border-b border-border flex-shrink-0">
                        <div className="flex w-full bg-muted p-1 rounded-md mb-4">
                            <Button variant={searchMode === 'profiles' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeSearchMode('profiles')}>
                                <Building2 className="mr-2 h-5 w-5" /> Professionals
                            </Button>
                            <Button variant={searchMode === 'projects' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeSearchMode('projects')}>
                                <Briefcase className="mr-2 h-5 w-5" /> Projectes
                            </Button>
                        </div>

                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold">
                                {searchMode === 'profiles' ? t('networkTitle') : "Projectes Oberts"}
                            </h2>
                            {/* Només mostrem el botó si estem en mode projectes I l'usuari té un equip actiu */}
                            {searchMode === 'projects' && activeTeam && (
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
                                placeholder={searchMode === 'profiles' ? t('searchPlaceholder') : "Cercar projectes..."}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                            />
                        </div>
                    </div>

                    {/* ✅ 2. CORRECCIÓ: Renderitzat condicional arreglat */}
                    {searchMode === 'profiles' ? (
                        <ProfileList
                            profiles={filteredProfiles}
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
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

                {/* Mapa Desktop */}
                <div className="hidden lg:block lg:col-span-2 rounded-lg overflow-hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        jobPostings={filteredJobPostings}
                        searchMode={searchMode}
                        selectedProfile={selectedProfile}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                        selectedProject={selectedProject}
                        onSelectProfile={handleSelectProfile}
                        onSelectProject={handleSelectProject}
                    />
                </div>

                {/* --- LAYOUT MÒBIL (default) --- */}

                {/* Mapa Mòbil (Sempre al fons) */}
                <div className="absolute inset-0 lg:hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        jobPostings={filteredJobPostings}
                        searchMode={searchMode}
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
                                <div className="flex w-full bg-muted p-1 rounded-md mb-4">
                                    <Button variant={searchMode === 'profiles' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeSearchMode('profiles')}>
                                        <Building2 className="mr-2 h-5 w-5" /> Professionals
                                    </Button>
                                    <Button variant={searchMode === 'projects' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => handleChangeSearchMode('projects')}>
                                        <Briefcase className="mr-2 h-5 w-5" /> Projectes
                                    </Button>
                                </div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-bold">
                                        {searchMode === 'profiles' ? t('networkTitle') : "Projectes Oberts"}
                                    </h2>
                                    {searchMode === 'projects' && (
                                        <Button size="sm" onClick={() => {/* TODO: Obrir Dialog */ }}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            Publicar
                                        </Button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder={searchMode === 'profiles' ? t('searchPlaceholder') : "Cercar projectes..."}
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* ✅ 3. CORRECCIÓ: Renderitzat condicional arreglat */}
                            {searchMode === 'profiles' ? (
                                <ProfileList
                                    profiles={filteredProfiles}
                                    searchTerm={searchTerm}
                                    onSearchChange={setSearchTerm}
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
                {/* ✅ RENDERITZEM EL DIALOG (només si hi ha un equip actiu) */}
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