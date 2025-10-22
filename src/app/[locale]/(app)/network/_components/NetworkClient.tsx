// src/app/[locale]/(app)/network/_components/NetworkClient.tsx

"use client";

import React, { useState, useMemo, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import ProfileList from './ProfileList';
import type { PublicProfileListItem, PublicProfileDetail } from '../types';
import { useTranslations } from 'next-intl';
import { List, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils/utils';
import { Button } from '@/components/ui/button';
import { getTeamDetailsAction } from '../actions';
import { toast } from 'sonner';

const MapLoadingSkeleton = () => {
    const t = useTranslations('NetworkPage');
    return <div className="w-full h-full bg-muted flex items-center justify-center"><p className="text-muted-foreground">{t('loadingMap')}</p></div>;
};

const DynamicMapContainer = dynamic(() => import('./MapContainer'), { loading: () => <MapLoadingSkeleton />, ssr: false });

// Alçada de la barra superior mòbil (AJUSTA A L'ALÇADA REAL)
const MOBILE_HEADER_HEIGHT_PX = 64;

export function NetworkClient({ profiles, errorMessage }: {
    profiles: PublicProfileListItem[];
    errorMessage?: string;
}) {
    const [selectedProfile, setSelectedProfile] = useState<PublicProfileListItem | null>(null);
    const [detailedProfile, setDetailedProfile] = useState<PublicProfileDetail | null>(null);
    const [isDetailsLoading, startDetailsTransition] = useTransition();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const t = useTranslations('NetworkPage');

    const filteredProfiles = useMemo(() => {
        // ... (igual que abans) ...
        if (!searchTerm) return profiles;
        return profiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [profiles, searchTerm]);

    const handleSelectProfile = (profile: PublicProfileListItem | null) => {
         // ... (igual que abans) ...
        setSelectedProfile(profile);
        setDetailedProfile(null);

        if (profile) {
            startDetailsTransition(async () => {
                const result = await getTeamDetailsAction(profile.id);
                if (result.success) {
                    setDetailedProfile(result.data as PublicProfileDetail);
                    setViewMode('map'); // Canvia a mapa en seleccionar i carregar
                } else {
                    toast.error("Error en carregar els detalls", { description: result.message });
                    setSelectedProfile(null);
                }
            });
        }
    };

    const handleMapDeselect = () => {
        // ... (igual que abans) ...
        setSelectedProfile(null);
        setDetailedProfile(null);
    }


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
            {/* ✅ fem servir 'relative' aquí perquè els fills 'absolute' s'hi posicionin */}
            <div className="flex-1 relative overflow-hidden lg:grid lg:grid-cols-3 lg:gap-8 lg:p-4">

                {/* --- LAYOUT DESKTOP (lg:) --- */}
                 {/* Llista Desktop */}
                <div className="hidden lg:flex lg:flex-col glass-effect rounded-lg overflow-hidden">
                    <ProfileList
                        profiles={filteredProfiles}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onSelectProfile={handleSelectProfile}
                        selectedProfileId={selectedProfile?.id}
                        className="flex flex-col h-full"
                    />
                </div>
                 {/* Mapa Desktop */}
                 <div className="hidden lg:block lg:col-span-2 rounded-lg overflow-hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        selectedProfile={selectedProfile}
                        onSelectProfile={handleMapDeselect}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                    />
                </div>

                 {/* --- LAYOUT MÒBIL (default) --- */}
                 {/* Mapa Mòbil (Sempre al fons) */}
                 {/* ✅ Posicionat absolutament dins del pare 'relative' */}
                <div className="absolute inset-0 lg:hidden">
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        selectedProfile={selectedProfile}
                        onSelectProfile={handleMapDeselect}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                    />
                </div>

                 {/* Llista Mòbil (Panell animat) */}
                 <AnimatePresence>
                    {viewMode === 'list' && (
                        <motion.div
                            key="profile-list-mobile"
                            className={cn(
                                // ✅ Posicionat absolutament per omplir l'àrea de contingut
                                "absolute inset-0 z-10 bg-background shadow-lg", // shadow-lg en lloc de shadow[...]
                                "lg:hidden" // Només visible en pantalles petites
                            )}
                            // ✅ Animació amb transform translateY
                            initial={{ y: "100%" }} // Comença fora (desplaçat cap avall)
                            animate={{ y: 0 }} // Puja (y=0)
                            exit={{ y: "100%" }} // Baixa en sortir
                            transition={{ type: "tween", ease: "easeInOut", duration: 0.3 }}
                        >
                            {/* ProfileList ha d'omplir aquest contenidor */}
                            <ProfileList
                                profiles={filteredProfiles}
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                onSelectProfile={handleSelectProfile}
                                selectedProfileId={selectedProfile?.id}
                                className="flex flex-col h-full" // Assegura alçada interna
                            />
                        </motion.div>
                    )}
                 </AnimatePresence>
            </div>
        </div>
    );
}