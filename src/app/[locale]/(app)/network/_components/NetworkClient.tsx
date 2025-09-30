// /app/[locale]/network/_components/NetworkClient.tsx

"use client";

import React, { useState, useMemo, useTransition } from 'react';
import dynamic from 'next/dynamic';
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
        if (!searchTerm) return profiles;
        return profiles.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [profiles, searchTerm]);

    const handleSelectProfile = (profile: PublicProfileListItem | null) => {
        setSelectedProfile(profile);
        setDetailedProfile(null);

        if (profile) {
            setViewMode('map');
            startDetailsTransition(async () => {
                const result = await getTeamDetailsAction(profile.id);
                if (result.success) {
                    setDetailedProfile(result.data as PublicProfileDetail);
                } else {
                    toast.error("Error en carregar els detalls", { description: result.message });
                }
            });
        }
    };

    if (errorMessage) {
        return <div className="p-8 text-destructive text-center">{errorMessage}</div>;
    }

    return (
        <div className="h-screen w-full flex flex-col bg-background">
            <div className="p-2 border-b bg-background/95 backdrop-blur-sm lg:hidden">
                <div className="flex w-full bg-muted p-1 rounded-md">
                    <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setViewMode('list')}>
                        <List className="mr-2 h-5 w-5" /> {t('listView')}
                    </Button>
                    <Button variant={viewMode === 'map' ? 'secondary' : 'ghost'} className="flex-1" onClick={() => setViewMode('map')}>
                        <MapIcon className="mr-2 h-5 w-5" /> {t('mapView')}
                    </Button>
                </div>
            </div>
            <div className="flex-1 flex lg:grid lg:grid-cols-3 lg:gap-8 lg:p-4 min-h-0">
                <div className={cn("lg:flex lg:flex-col", viewMode === 'list' ? 'flex' : 'hidden')}>
                    <ProfileList
                        profiles={filteredProfiles}
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        onSelectProfile={handleSelectProfile}
                        selectedProfileId={selectedProfile?.id}
                    />
                </div>
                <div className={cn("lg:col-span-2 lg:block rounded-lg overflow-hidden", viewMode === 'map' ? 'block h-full w-full' : 'hidden')}>
                    <DynamicMapContainer
                        profiles={filteredProfiles}
                        selectedProfile={selectedProfile}
                        onSelectProfile={handleSelectProfile}
                        detailedProfile={detailedProfile}
                        isLoading={isDetailsLoading}
                    />
                </div>
            </div>
        </div>
    );
}