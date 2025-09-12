// src/app/_components/network/MapView.tsx
"use client"; // Molt important! Indica que és un component de client.

import 'mapbox-gl/dist/mapbox-gl.css';
import { useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import type { PublicProfile } from '@/types';

interface MapViewProps {
  profiles: PublicProfile[];
}

export default function MapView({ profiles }: MapViewProps) {
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);

  return (
    <div className="w-full h-[calc(100vh-theme(spacing.24))]"> {/* Ajusta l'alçada segons el teu layout */}
      <Map
        initialViewState={{
          longitude: 2.1734, // Centrat a Barcelona per defecte
          latitude: 41.3851,
          zoom: 7,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11" // Estil de mapa fosc
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!}
      >
        <NavigationControl />

        {profiles.map((profile) => (
          <Marker
            key={profile.id}
            longitude={profile.longitude}
            latitude={profile.latitude}
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              setSelectedProfile(profile);
            }}
          >
            {/* Un marcador personalitzat que encaixa amb el teu disseny */}
            <div className="bg-purple-600 w-4 h-4 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform" />
          </Marker>
        ))}

        {selectedProfile && (
          <Popup
            longitude={selectedProfile.longitude}
            latitude={selectedProfile.latitude}
            onClose={() => setSelectedProfile(null)}
            closeOnClick={false}
            anchor="bottom"
            // Estil del popup per a tema fosc
            className="popup-dark" 
          >
            <div className="p-1 max-w-xs">
              <h3 className="font-bold text-md mb-1">{selectedProfile.company_name}</h3>
              <p className="text-sm my-1 text-gray-300">{selectedProfile.summary}</p>
              {selectedProfile.services && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedProfile.services.map((service) => (
                    <span key={service} className="bg-gray-700 text-xs px-2 py-1 rounded-full">
                      {service}
                    </span>
                  ))}
                </div>
              )}
              {selectedProfile.website_url && (
                  <a href={selectedProfile.website_url} target="_blank" rel="noopener noreferrer" className="text-purple-400 text-sm mt-2 block hover:underline">
                    Visitar web
                  </a>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}