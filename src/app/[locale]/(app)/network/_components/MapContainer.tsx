/**
 * @file MapContainer.tsx
 * @summary Component de client que renderitza un mapa interactiu utilitzant Mapbox GL i react-map-gl.
 * Mostra una sèrie de marcadors per a cada perfil professional i permet seleccionar-los per veure'n
 * els detalls en un Popup. També anima el mapa per centrar-se en el perfil seleccionat.
 */

"use client"; // Directiva de Next.js. Necessària per a la interactivitat del mapa i l'ús de hooks.


import 'mapbox-gl/dist/mapbox-gl.css'; // Importació dels estils CSS base de Mapbox.
import { useRef, useEffect } from 'react';
// Importació de components i tipus de la llibreria 'react-map-gl', un embolcall de Mapbox GL per a React.
import Map, { Marker, Popup, NavigationControl, MapRef } from 'react-map-gl';
import type { PublicProfile } from '../types';
import { Building2 } from 'lucide-react'; // Icona per a marcadors sense logo.
import Image from 'next/image'; // Component optimitzat d'imatges de Next.js.
import { useTranslations } from 'next-intl'; // ✅ Importem el hook

/**
 * @interface MapContainerProps
 * @summary Defineix les propietats que el component MapContainer espera rebre.
 */
interface MapContainerProps {
    /** Array de perfils públics que s'han de mostrar al mapa. */
    profiles: PublicProfile[];
    /** El perfil que està actualment seleccionat (pot ser null si no n'hi ha cap). */
    selectedProfile: PublicProfile | null;
    /** Funció callback per notificar al component pare quan es selecciona o deselecciona un perfil. */
    onSelectProfile: (profile: PublicProfile | null) => void;
  }
  
/**
 * @function MapContainer
 * @summary El component principal que renderitza i gestiona la lògica del mapa.
 */
export default function MapContainer({ profiles, selectedProfile, onSelectProfile }: MapContainerProps) {
    // Utilitzem una 'ref' per obtenir una referència directa a la instància del mapa.
  // Això ens permetrà cridar a mètodes de l'API del mapa, com 'flyTo'.
  const mapRef = useRef<MapRef>(null);
  const t = useTranslations('NetworkPage'); // ✅ Cridem el hook
  // Guardem el token en una variable per fer una comprovació de seguretat abans de renderitzar.
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
/**
   * @effect useEffect
   * @summary Aquest efecte s'activa cada vegada que la propietat `selectedProfile` canvia.
   * Si es selecciona un perfil nou, utilitza el mètode 'flyTo' per animar el mapa
   * i centrar-lo suaument a les coordenades del perfil seleccionat.
   */
  
  useEffect(() => {
    if (selectedProfile && mapRef.current) {
      mapRef.current.flyTo({
        center: [selectedProfile.longitude, selectedProfile.latitude],
        zoom: 14,
        duration: 1500,
      });
    }
  }, [selectedProfile]);

    // Comprovació de seguretat: si el token de Mapbox no està configurat, mostrem un missatge d'error
  // en lloc de deixar que l'aplicació falli o mostri un mapa buit.
  if (!mapboxToken) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-red-400 p-4">
        {t('mapboxError')} {/* ✅ Text traduït */}
        </div>
    );
  }
// Renderització del component.
  return (
      <Map
        ref={mapRef}
        initialViewState={{ longitude: 2.1734, latitude: 41.3851, zoom: 7 }} // Vista inicial centrada a Catalunya.
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11" // Estil del mapa (en aquest cas, un tema fosc).
        mapboxAccessToken={mapboxToken} // Passem el token d'API al mapa.
        onDragStart={() => onSelectProfile(null)} // Si l'usuari arrossega el mapa, deseleccionem qualsevol perfil.
    >
       {/* Afegeix els controls de zoom i rotació al mapa. */}
      <NavigationControl position="top-right" />
  {/* Iterem sobre l'array de perfils per crear un marcador per a cadascun. */}
      {profiles.map((profile) => (
        <Marker
          key={profile.id} // Clau única per a cada element de la llista.
          longitude={profile.longitude}
          latitude={profile.latitude}
          onClick={(e) => {
            e.originalEvent.stopPropagation(); // Evitem que l'esdeveniment de clic es propagui al mapa.
              onSelectProfile(profile); // Notifiquem al pare que s'ha seleccionat un perfil.
          }}
        >
          {/* Contenidor per a l'estil i l'animació del marcador. */}

          <div className="transform transition-transform duration-200 hover:scale-125">
            {/* Si el perfil té un logo, el mostrem. Si no, mostrem una icona genèrica. */}
            {profile.logo_url ? (
              <Image 
                src={profile.logo_url} 
                alt={t('logoAltText', { companyName: profile.company_name || t('unknownCompany') })}
                width={32}
                height={32}
                className="rounded-full border-2 border-purple-500 object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-800 border-2 border-purple-500 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-purple-300" />
              </div>
            )}
          </div>
        </Marker>
      ))}
      {/* Renderització condicional del Popup: només es mostra si hi ha un perfil seleccionat. */}

      {selectedProfile && (
        <Popup
          longitude={selectedProfile.longitude}
          latitude={selectedProfile.latitude}
          onClose={() => onSelectProfile(null)} // Permet tancar el popup.
          closeOnClick={false} // El popup no es tanca si es fa clic al mapa.
          anchor="bottom" // El popup apareix a sobre del marcador.
          className="popup-dark" // Classe CSS personalitzada per a l'estil fosc.
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
