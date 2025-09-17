/**
 * @file MapView.tsx
 * @summary Aquest component sembla ser una versió anterior o alternativa de `MapContainer`.
 * És un component de client que renderitza un mapa de Mapbox amb marcadors per a una llista de perfils.
 * La gestió de la selecció del perfil és interna al component, a diferència de `MapContainer`
 * que la delega al seu component pare.
 */

"use client"; // Marca aquest component per ser executat al navegador.

import 'mapbox-gl/dist/mapbox-gl.css'; // Estils base de Mapbox.
import { useState } from 'react';
import Map, { Marker, Popup, NavigationControl } from 'react-map-gl';
import type { PublicProfile } from '@/types';
import { useTranslations } from 'next-intl'; // ✅ Importem el hook

/**
 * @interface MapViewProps
 * @summary Defineix les propietats que el component MapView espera rebre.
 */
interface MapViewProps {
  /** Un array de perfils públics per mostrar com a marcadors al mapa. */
  profiles: PublicProfile[];
}

/**
 * @function MapView
 * @summary Renderitza un mapa de Mapbox amb la gestió de la selecció de perfils de manera interna.
 */
export default function MapView({ profiles }: MapViewProps) {
  // Utilitzem 'useState' per gestionar quin perfil està seleccionat actualment.
  // Aquesta és la diferència principal amb 'MapContainer', on aquest estat es gestiona des de l'exterior.
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
      const t = useTranslations('NetworkPage'); // ✅ Cridem el hook
  return (
    <div className="w-full h-[calc(100vh-theme(spacing.24))]"> {/* L'alçada es calcula per omplir l'espai disponible. */}
      <Map
        initialViewState={{
          longitude: 2.1734, // Centrat a Barcelona per defecte.
          latitude: 41.3851,
          zoom: 7,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!}
      >
        <NavigationControl />

      {/* Iterem sobre els perfils per crear un marcador per a cadascun. */}
        {profiles.map((profile) => (
          <Marker
            key={profile.id}
            longitude={profile.longitude}
            latitude={profile.latitude}
            onClick={(e) => {
              e.originalEvent.stopPropagation(); // Evita que altres esdeveniments de clic s'activin.
              setSelectedProfile(profile); // Actualitzem l'estat intern per mostrar el popup.
            }}
          >
            {/* Marcador visualment simple: un cercle de color. */}
            <div className="bg-purple-600 w-4 h-4 rounded-full border-2 border-white cursor-pointer hover:scale-125 transition-transform" />
          </Marker>
        ))}

      {/* El popup es mostra només si 'selectedProfile' no és null. */}
        {selectedProfile && (
          <Popup
            longitude={selectedProfile.longitude}
            latitude={selectedProfile.latitude}
            onClose={() => setSelectedProfile(null)} // En tancar, resetejem l'estat.
            closeOnClick={false}
            anchor="bottom"
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
                    {t('visitWebsite')} {/* ✅ Text traduït */}
                  </a>
              )}
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
