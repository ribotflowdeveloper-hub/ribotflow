// src/app/_components/network/NetworkClient.tsx
"use client";

import { useState, useMemo } from 'react';
import { PublicProfile } from '@/types';
import ProfileList from './ProfileList';
import MapContainer from './MapContainer';

interface NetworkClientProps {
  profiles: PublicProfile[];
}

export default function NetworkClient({ profiles }: NetworkClientProps) {
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrem els perfils segons la cerca (ignorant majúscules/minúscules)
  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    return profiles.filter(p =>
      p.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.services?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [profiles, searchTerm]);

  return (
    <div className="flex h-[calc(100vh-6rem)]"> {/* Ajusta l'alçada segons el teu header */}
      {/* Panell Esquerre: Llista de Perfils */}
      <aside className="w-1/3 min-w-[350px] max-w-[450px] bg-gray-900/50 border-r border-gray-700 flex flex-col">
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
        <MapContainer
          profiles={filteredProfiles}
          selectedProfile={selectedProfile}
          onSelectProfile={setSelectedProfile}
        />
      </main>
    </div>
  );
}