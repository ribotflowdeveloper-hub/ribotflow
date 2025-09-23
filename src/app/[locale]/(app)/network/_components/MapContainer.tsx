"use client";

import 'mapbox-gl/dist/mapbox-gl.css';
import { useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, MapRef } from 'react-map-gl';
import type { PublicProfileListItem, PublicProfileDetail } from '../types';
import { Building2, Globe, Briefcase, Loader2, Mail, Phone } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface MapContainerProps {
  profiles: PublicProfileListItem[];
  selectedProfile: PublicProfileListItem | null;
  onSelectProfile: (profile: PublicProfileListItem | null) => void;
  detailedProfile: PublicProfileDetail | null;
  isLoading: boolean;
}

// ✅ 2. Creem una funció per a formatar l'URL del web
const formatWebsiteUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
  }
  return `https://${url}`;
};
 
export default function MapContainer({ profiles, selectedProfile, onSelectProfile, detailedProfile, isLoading }: MapContainerProps) {
    const mapRef = useRef<MapRef>(null);
    const t = useTranslations('NetworkPage');
    const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

    useEffect(() => {
        if (selectedProfile && selectedProfile.latitude != null && selectedProfile.longitude != null && mapRef.current) {
            mapRef.current.flyTo({ center: [selectedProfile.longitude, selectedProfile.latitude], zoom: 14, duration: 1500 });
        }
    }, [selectedProfile]);

    if (!mapboxToken) return <div className="w-full h-full flex items-center justify-center bg-gray-800 text-red-400 p-4">{t('mapboxError')}</div>;
    return (
      <Map ref={mapRef} initialViewState={{ longitude: 2.1734, latitude: 41.3851, zoom: 7 }} style={{ width: '100%', height: '100%' }} mapStyle="mapbox://styles/mapbox/dark-v11" mapboxAccessToken={mapboxToken} onDragStart={() => onSelectProfile(null)}>
          <NavigationControl position="top-right" />
          
          {profiles.filter(p => p.latitude != null && p.longitude != null).map((profile) => (
              <Marker key={profile.id} longitude={profile.longitude!} latitude={profile.latitude!} onClick={(e) => { e.originalEvent.stopPropagation(); onSelectProfile(profile); }}>
                  <div className="transform transition-transform duration-200 hover:scale-125">
                      {profile.logo_url ? <Image src={profile.logo_url} alt={t('logoAltText', { companyName: profile.name })} width={32} height={32} className="rounded-full border-2 border-purple-500 object-cover" /> : <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-purple-500 flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-300" /></div>}
                  </div>
              </Marker>
          ))}
          
          {selectedProfile && selectedProfile.latitude != null && selectedProfile.longitude != null && (
              <Popup longitude={selectedProfile.longitude} latitude={selectedProfile.latitude} onClose={() => onSelectProfile(null)} closeOnClick={false} anchor="bottom" className="popup-dark">
                  {isLoading && <div className="p-4 flex justify-center"><Loader2 className="animate-spin text-white" /></div>}
                  {detailedProfile && !isLoading && (
                      <div className="max-w-xs p-1 text-white space-y-2">
                          <div className="flex items-center gap-3">
                              {detailedProfile.logo_url ? <Image src={detailedProfile.logo_url} alt={`Logo de ${detailedProfile.name}`} width={40} height={40} className="rounded-full object-cover bg-gray-700" /> : <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0"><Building2 className="w-5 h-5 text-gray-400" /></div>}
                              <div>
                                  <h3 className="font-bold">{detailedProfile.name}</h3>
                                  {detailedProfile.owner?.full_name && <p className="text-xs text-gray-400">de {detailedProfile.owner.full_name}</p>}
                              </div>
                          </div>

                          {detailedProfile.summary && <p className="text-sm text-gray-300">{detailedProfile.summary}</p>}
                          
                          {/* ✅ 3. AFEGIM ELS NOUS CAMPS I CORREGIM L'ENLLAÇ */}
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
      </Map>
  );
}