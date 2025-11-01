// /app/[locale]/network/_components/MapContainer.tsx

"use client";

import 'mapbox-gl/dist/mapbox-gl.css';
import { useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, MapRef } from 'react-map-gl';
// ✅ 1. Importem els nous tipus i icones
import type { PublicProfileListItem, PublicProfileDetail, JobPostingListItem } from '../types';
import { Building2, Globe, Briefcase, Loader2, Mail, Phone, MapPin } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

// ✅ 2. Definim les noves props que rebem de NetworkClient
interface MapContainerProps {
    profiles: PublicProfileListItem[];
    jobPostings: JobPostingListItem[];
    searchMode: 'profiles' | 'projects';
    
    selectedProfile: PublicProfileListItem | null;
    detailedProfile: PublicProfileDetail | null;
    isLoading: boolean;
    onSelectProfile: (profile: PublicProfileListItem | null) => void;
    
    selectedProject: JobPostingListItem | null;
    onSelectProject: (project: JobPostingListItem | null) => void;
    // (Pendent) Podríem afegir detailedProject i isProjectLoading
}

const formatWebsiteUrl = (url: string | null | undefined): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
    }
    return `https://${url}`;
};

export default function MapContainer({ 
    profiles, 
    jobPostings, 
    searchMode,
    selectedProfile, 
    detailedProfile, 
    isLoading,
    onSelectProfile,
    selectedProject,
    onSelectProject
}: MapContainerProps) {
    const mapRef = useRef<MapRef>(null);
    const t = useTranslations('NetworkPage');
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    // Efecte per volar al perfil seleccionat
    useEffect(() => {
        if (selectedProfile && selectedProfile.latitude != null && selectedProfile.longitude != null && mapRef.current) {
            mapRef.current.flyTo({ center: [selectedProfile.longitude, selectedProfile.latitude], zoom: 14, duration: 1500 });
        }
    }, [selectedProfile]);

    // ✅ 3. Nou efecte per volar al projecte seleccionat
    useEffect(() => {
        if (selectedProject && selectedProject.latitude != null && selectedProject.longitude != null && mapRef.current) {
            mapRef.current.flyTo({ center: [selectedProject.longitude, selectedProject.latitude], zoom: 14, duration: 1500 });
        }
    }, [selectedProject]);

    // ✅ 4. Gestor per deseleccionar tot en arrossegar el mapa
    const handleDragStart = () => {
        onSelectProfile(null);
        onSelectProject(null);
    };

    if (!mapboxToken) {
        return <div className="w-full h-full flex items-center justify-center bg-gray-800 text-red-400 p-4">{t('mapboxError')}</div>;
    }

    return (
        <Map 
            ref={mapRef} 
            initialViewState={{ longitude: 2.1734, latitude: 41.3851, zoom: 7 }} 
            style={{ width: '100%', height: '100%' }} 
            mapStyle="mapbox://styles/mapbox/dark-v11" 
            mapboxAccessToken={mapboxToken} 
            onDragStart={handleDragStart} // Deseleccionem en moure
        >
            <NavigationControl position="top-right" />
            
            {/* ✅ 5. Renderitzem Marcadors de PROFESSIONALS (Empreses) */}
            {searchMode === 'profiles' && profiles.filter(p => p.latitude != null && p.longitude != null).map((profile) => (
                <Marker 
                    key={`profile-${profile.id}`} 
                    longitude={profile.longitude!} 
                    latitude={profile.latitude!} 
                    onClick={(e) => { 
                        e.originalEvent.stopPropagation(); 
                        onSelectProfile(profile); // Cridem al handler de perfils
                    }}
                >
                    <div className="transform transition-transform duration-200 hover:scale-125">
                        {profile.logo_url 
                            ? <Image src={profile.logo_url} alt={t('logoAltText', { companyName: profile.name })} width={32} height={32} className="rounded-full border-2 border-purple-500 object-cover" /> 
                            : <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-purple-500 flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-300" /></div>
                        }
                    </div>
                </Marker>
            ))}

            {/* ✅ 6. Renderitzem Marcadors de PROJECTES (Ofertes) */}
            {searchMode === 'projects' && jobPostings.filter(p => p.latitude != null && p.longitude != null).map((project) => (
                <Marker 
                    key={`job-${project.id}`} 
                    longitude={project.longitude!} 
                    latitude={project.latitude!} 
                    onClick={(e) => { 
                        e.originalEvent.stopPropagation(); 
                        onSelectProject(project); // Cridem al handler de projectes
                    }}
                >
                    <div className="transform transition-transform duration-200 hover:scale-125">
                        {/* Marcador diferent: Taronja i amb icona de maletí */}
                        <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-orange-500 flex items-center justify-center">
                            <Briefcase className="w-4 h-4 text-orange-300" />
                        </div>
                    </div>
                </Marker>
            ))}
            
            {/* ✅ 7. Popup per a PROFESSIONALS (codi existent) */}
            {selectedProfile && selectedProfile.latitude != null && selectedProfile.longitude != null && (
                <Popup 
                    longitude={selectedProfile.longitude} 
                    latitude={selectedProfile.latitude} 
                    onClose={() => onSelectProfile(null)} // Deseleccionem en tancar
                    closeOnClick={false} 
                    anchor="bottom" 
                    className="popup-dark"
                >
                    {isLoading && <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-white" /></div>}
                    {detailedProfile && !isLoading && (
                        <div className="max-w-xs p-1 text-white space-y-2">
                            <div className="flex items-center gap-3">
                                {detailedProfile.logo_url 
                                    ? <Image src={detailedProfile.logo_url} alt={`Logo de ${detailedProfile.name}`} width={40} height={40} className="rounded-full object-cover bg-gray-700" /> 
                                    : <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-gray-400" /></div>
                                }
                                <div>
                                    <h3 className="font-bold">{detailedProfile.name}</h3>
                                    {detailedProfile.owner?.full_name && <p className="text-xs text-gray-400">de {detailedProfile.owner.full_name}</p>}
                                </div>
                            </div>

                            {detailedProfile.summary && <p className="text-sm text-gray-300">{detailedProfile.summary}</p>}
                            
                            <div className="text-xs space-y-1 pt-2 border-t border-gray-700">
                                {detailedProfile.phone && (
                                    <a href={`tel:${detailedProfile.phone}`} className="flex items-center gap-2 text-gray-300 hover:text-white">
                                        <Phone className="w-3 h-3" /> {detailedProfile.phone}
                                    </a>
                                )}
                                {detailedProfile.email && (
                                    <a href={`mailto:${detailedProfile.email}`} className="flex items-center gap-2 text-gray-300 hover:text-white">
                                        <Mail className="w-3 h-3" /> {detailedProfile.email}
                                    </a>
                                )}
                                {detailedProfile.website && (
                                    <a href={formatWebsiteUrl(detailedProfile.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-purple-400 hover:underline">
                                        <Globe className="w-3 h-3" /> Visitar web
                                    </a>
                                )}
                            </div>

                            {detailedProfile.services && detailedProfile.services.length > 0 && (
                                <div className="pt-2 border-t border-gray-700">
                                    <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1 flex items-center gap-2"><Briefcase className="w-3 h-3"/> Serveis</h4>
                                    <div className="flex flex-wrap gap-1">
                                        {detailedProfile.services.map((s) => (<span key={s} className="bg-gray-700 text-xs px-2 py-1 rounded-full">{s}</span>))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </Popup>
            )}

            {/* ✅ 8. NOU Popup per a PROJECTES */}
            {selectedProject && selectedProject.latitude != null && selectedProject.longitude != null && (
                <Popup 
                    longitude={selectedProject.longitude} 
                    latitude={selectedProject.latitude} 
                    onClose={() => onSelectProject(null)} // Deseleccionem en tancar
                    closeOnClick={false} 
                    anchor="bottom" 
                    className="popup-dark"
                >
                    {/* (Pendent) Aquí hi aniria un 'isLoadingProject' */}
                    {/* {isProjectLoading && <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-white" /></div>} */}

                    {/* Mostrem les dades bàsiques que ja tenim */}
                    <div className="max-w-xs p-1 text-white space-y-2">
                        <div className="flex items-center gap-3">
                            {selectedProject.teams?.logo_url 
                                ? <Image src={selectedProject.teams.logo_url} alt={`Logo de ${selectedProject.teams.name}`} width={40} height={40} className="rounded-full object-cover bg-gray-700" /> 
                                : <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"><Briefcase className="w-5 h-5 text-gray-400" /></div>
                            }
                            <div>
                                <h3 className="font-bold">{selectedProject.title}</h3>
                                {selectedProject.teams?.name && <p className="text-xs text-gray-400">Publicat per {selectedProject.teams.name}</p>}
                            </div>
                        </div>

                        {selectedProject.address_text && (
                             <p className="text-sm text-gray-300 flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> {selectedProject.address_text}
                            </p>
                        )}

                        {/* (Pendent) Aquí mostrariem més detalls (descripció, skills) 
                            si els carreguéssim amb una 'getJobPostingDetailsAction' */}

                        <div className="pt-2 border-t border-gray-700">
                            <a 
                                href={`/app/comunicacio/inbox?to=${selectedProject.team_id}`} // Enllaç provisional a l'inbox
                                className="text-sm text-purple-400 hover:underline"
                            >
                                Contactar
                            </a>
                        </div>
                    </div>
                </Popup>
            )}

        </Map>
    );
}