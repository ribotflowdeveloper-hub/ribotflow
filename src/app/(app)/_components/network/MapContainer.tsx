// src/app/_components/network/MapContainer.tsx
"use client";

import 'mapbox-gl/dist/mapbox-gl.css';
import { useRef, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, MapRef } from 'react-map-gl';
import type { PublicProfile } from '@/types';
import { Building2 } from 'lucide-react';

interface MapContainerProps {
  profiles: PublicProfile[];
  selectedProfile: PublicProfile | null;
  onSelectProfile: (profile: PublicProfile | null) => void;
}

export default function MapContainer({ profiles, selectedProfile, onSelectProfile }: MapContainerProps) {
  const mapRef = useRef<MapRef>(null);

  useEffect(() => {
    if (selectedProfile && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedProfile.longitude, selectedProfile.latitude],
        zoom: 14,
        duration: 1500,
      });
    }
  }, [selectedProfile]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{ longitude: 2.1734, latitude: 41.3851, zoom: 7 }}
      style={{ width: '100%', height: '100%' }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!}
      // 👇 LÍNIA CORREGIDA: onInteractionStateChange -> onDragStart
      onDragStart={() => onSelectProfile(null)}
    >
      <NavigationControl position="top-right" />

      {profiles.map((profile) => (
        <Marker
          key={profile.id}
          longitude={profile.longitude}
          latitude={profile.latitude}
          onClick={(e) => {
            e.originalEvent.stopPropagation();
            onSelectProfile(profile);
          }}
        >
          <div className="transform transition-transform duration-200 hover:scale-125">
            {profile.logo_url ? (
              <img src={profile.logo_url} className="w-8 h-8 rounded-full border-2 border-purple-500 object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-purple-500 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-300" />
              </div>
            )}
          </div>
        </Marker>
      ))}

      {selectedProfile && (
        <Popup
          longitude={selectedProfile.longitude}
          latitude={selectedProfile.latitude}
          onClose={() => onSelectProfile(null)}
          closeOnClick={false}
          anchor="bottom"
          className="popup-dark"
        >
          <div className="max-w-xs p-1">
            <h3 className="font-bold">{selectedProfile.company_name}</h3>
            <p className="text-sm text-gray-300 my-1">{selectedProfile.summary}</p>
            {selectedProfile.services && (
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedProfile.services.map((s) => (
                  <span key={s} className="bg-gray-700 text-xs px-2 py-1 rounded-full">{s}</span>
                ))}
              </div>
            )}
          </div>
        </Popup>
      )}
    </Map>
  );
}