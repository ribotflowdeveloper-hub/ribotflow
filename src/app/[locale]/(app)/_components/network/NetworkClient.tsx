/**
 * @file NetworkClient.tsx
 * @summary Aquest és un component de client que actua com a orquestrador principal per a la pàgina de la xarxa.
 * La seva funció és mantenir l'estat compartit (com el perfil seleccionat i el terme de cerca)
 * i passar les dades i les funcions necessàries als seus components fills: `ProfileList` i `MapContainer`.
 * Aquest patró es coneix com a "aixecar l'estat" (lifting state up).
 */

"use client"; // Necessari perquè gestiona l'estat i la interactivitat de l'usuari.

import { useState, useMemo } from 'react';
import { PublicProfile } from '@/types';
import ProfileList from './ProfileList';
import MapContainer from './MapContainer';

/**
 * @interface NetworkClientProps
 * @summary Defineix les propietats que el component NetworkClient espera rebre.
 */
interface NetworkClientProps {
  /** La llista inicial i completa de tots els perfils públics, rebuda des d'un component de servidor. */
  profiles: PublicProfile[];
}

/**
 * @function NetworkClient
 * @summary Renderitza la disposició de dos panells (llista a l'esquerra, mapa a la dreta) i gestiona la comunicació entre ells.
 */
export default function NetworkClient({ profiles }: NetworkClientProps) {
  // Estat per guardar quin perfil està seleccionat actualment. Aquest estat es comparteix
  // entre la llista i el mapa.
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  // Estat per guardar el text que l'usuari escriu al camp de cerca.
  const [searchTerm, setSearchTerm] = useState('');

  /**
   * @constant filteredProfiles
   * @summary Utilitzem `useMemo` per a optimitzar el rendiment. Aquesta funció només es tornarà a executar
   * si `profiles` o `searchTerm` canvien. Filtra la llista de perfils basant-se en el terme de cerca,
   * buscant coincidències al nom de l'empresa o als serveis que ofereix.
   */
  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles; // Si no hi ha cerca, retornem tots els perfils.
    return profiles.filter(p =>
      p.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.services?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [profiles, searchTerm]);

  return (
    // Estructura principal de la pàgina amb flexbox per crear els dos panells.
    <div className="flex h-[calc(100vh-6rem)]">
      {/* Panell Esquerre: Llista de Perfils */}
      <aside className="w-1/3 min-w-[350px] max-w-[450px] bg-gray-900/50 border-r border-gray-700 flex flex-col">
        {/*
          Renderitzem el component de la llista i li passem:
          - La llista de perfils ja filtrada.
          - L'estat actual de la cerca i la funció per actualitzar-lo.
          - La funció per seleccionar un perfil i l'ID del perfil actualment seleccionat.
        */}
        <ProfileList
          profiles={filteredProfiles}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectProfile={setSelectedProfile}
          selectedProfileId={selectedProfile?.id}
        />
      </aside>

      {/* Panell Dret: Mapa */}
      <main className="flex-1">
        {/*
          Renderitzem el component del mapa i li passem:
          - La llista de perfils filtrada per mostrar els marcadors correctes.
          - El perfil actualment seleccionat perquè el mapa pugui centrar-s'hi i mostrar el popup.
          - La funció per actualitzar el perfil seleccionat (per exemple, si es fa clic a un marcador).
        */}
        <MapContainer
          profiles={filteredProfiles}
          selectedProfile={selectedProfile}
          onSelectProfile={setSelectedProfile}
        />
      </main>
    </div>
  );
}
