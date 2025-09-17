"use client";

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ProfileList from './ProfileList'; // Assegurem que l'import és per defecte
import type { PublicProfile } from '@/types/network';

// ✅ Importem el component del mapa de manera dinàmica
const DynamicMapContainer = dynamic(
  () => import('./MapContainer'),
  {
    loading: () => <div className="w-full h-full bg-gray-800/50 rounded-lg flex items-center justify-center animate-pulse">Carregant Mapa...</div>,
    ssr: false,
  }
);

interface NetworkClientProps {
  profiles: PublicProfile[];
}

/**
 * @summary Component de client que orquestra la pàgina de Network.
 */
export function NetworkClient({ profiles }: NetworkClientProps) {
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  // ✅ NOU: Afegim l'estat per a la cerca
  const [searchTerm, setSearchTerm] = useState('');

  const handleSelectProfile = (profile: PublicProfile | null) => {
    setSelectedProfile(profile);
  };
  
  // ✅ NOU: Memoitzem el filtratge per a un millor rendiment
  const filteredProfiles = useMemo(() => {
    if (!searchTerm) {
      return profiles;
    }
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.services?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [profiles, searchTerm]);

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 h-full flex flex-col glass-effect rounded-lg">
        {/* ✅ CORRECCIÓ: Passem les propietats correctes a ProfileList */}
        <ProfileList
          profiles={filteredProfiles}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectProfile={handleSelectProfile}
          selectedProfileId={selectedProfile?.id}
        />
      </div>
      <div className="lg:col-span-2 h-full rounded-lg overflow-hidden">
        <DynamicMapContainer
          profiles={filteredProfiles} // Passem els perfils filtrats al mapa també
          selectedProfile={selectedProfile}
          onSelectProfile={handleSelectProfile}
        />
      </div>
    </div>
  );
}