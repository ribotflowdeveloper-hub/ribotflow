/**
 * @file NetworkClient.tsx
 * @summary Orquesta la página de Network amb un disseny optimitzat per a mòbil (pantalla completa) i escriptori.
 */
"use client";

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ProfileList from './ProfileList';
import type { PublicProfile } from '../types';
import { useTranslations } from 'next-intl';
import { List, Map as MapIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const MapLoadingSkeleton = () => {
    const t = useTranslations('NetworkPage');
    return (
        <div className="w-full h-full bg-muted flex items-center justify-center">
            <p className="text-muted-foreground">{t('loadingMap')}</p>
        </div>
    );
};

const DynamicMapContainer = dynamic(
    () => import('./MapContainer'),
    { loading: () => <MapLoadingSkeleton />, ssr: false }
);

interface NetworkClientProps {
    profiles: PublicProfile[];
    errorMessage?: string;
}

export function NetworkClient({ profiles, errorMessage }: NetworkClientProps) {
    const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const t = useTranslations('NetworkPage');

    const filteredProfiles = useMemo(() => {
        if (!searchTerm) return profiles;
        return profiles.filter(p =>
            p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.services?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [profiles, searchTerm]);

    const handleSelectProfile = (profile: PublicProfile | null) => {
        setSelectedProfile(profile);
        if (profile) {
            setViewMode('map');
        }
    }

    if (errorMessage) {
        return <div className="p-8 text-destructive text-center">{errorMessage}</div>;
    }

    return (
        // ✅ ESTRUCTURA PRINCIPAL: Ocupa tota la pantalla i és un contenidor vertical.
        <div className="h-screen w-full flex flex-col bg-background">
            
            {/* ✅ NOU: CAPÇALERA AMB BOTONS (NOMÉS PER A MÒBILS) */}
            <div className="p-2 border-b bg-background/95 backdrop-blur-sm lg:hidden">
                <div className="flex w-full bg-muted p-1 rounded-md">
                    <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        className="flex-1"
                        onClick={() => setViewMode('list')}
                    >
                        <List className="mr-2 h-5 w-5" /> {t('listView')}
                    </Button>
                    <Button
                        variant={viewMode === 'map' ? 'secondary' : 'ghost'}
                        className="flex-1"
                        onClick={() => setViewMode('map')}
                    >
                        <MapIcon className="mr-2 h-5 w-5" /> {t('mapView')}
                    </Button>
                </div>
            </div>

            {/* ✅ ÀREA DE CONTINGUT: Ocupa la resta de l'espai i canvia de flex a grid. */}
            <div className="flex-1 flex lg:grid lg:grid-cols-3 lg:gap-8 lg:p-4 min-h-0">
                
                {/* COLUMNA 1: LLISTA DE PERFILS */}
                <div className={cn(
                    // Estils d'escriptori: sempre visible, ocupa 1 columna.
                    "lg:flex lg:flex-col", 
                    // Estils de mòbil: només visible si el mode és 'list'.
                    viewMode === 'list' ? 'flex' : 'hidden'
                )}>
                    <ProfileList
                        profiles={filteredProfiles}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onSelectProfile={handleSelectProfile}
                        selectedProfileId={selectedProfile?.id}
                    />
                </div>

                {/* COLUMNA 2: MAPA */}
                <div className={cn(
                    // Estils d'escriptori: sempre visible, ocupa 2 columnes.
                    "lg:col-span-2 lg:block rounded-lg overflow-hidden",
                    // Estils de mòbil: ocupa tota la pantalla i només és visible si el mode és 'map'.
                    viewMode === 'map' ? 'block h-full w-full' : 'hidden'
                )}>
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        selectedProfile={selectedProfile}
                        onSelectProfile={setSelectedProfile}
                    />
                </div>
            </div>
        </div>
    );
}

// ⚠️ Recorda afegir les noves traduccions al teu fitxer messages/ca.json:
/*
{
  "NetworkPage": {
    "listView": "Llista",
    "mapView": "Mapa",
    ...
  }
}
*/