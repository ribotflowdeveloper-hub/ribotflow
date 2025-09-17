/**
 * @file NetworkClient.tsx
 * @summary Orquesta la página de Network, gestionando el estado entre la lista y el mapa.
 */
"use client";

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import ProfileList from './ProfileList';
import type { PublicProfile } from '../types';
import { useTranslations } from 'next-intl';

// ✅ 1. CREAMOS UN COMPONENTE DEDICADO PARA EL ESTADO DE CARGA
/**
 * @summary Esqueleto de carga para el mapa, ahora como un componente de React válido.
 */
const MapLoadingSkeleton = () => {
  // Ahora podemos usar el hook aquí sin problemas.
  const t = useTranslations('NetworkPage');
  return (
    <div className="w-full h-full bg-gray-800/50 rounded-lg flex items-center justify-center animate-pulse">
      {t('loadingMap')}
    </div>
  );
};

// ✅ 2. EL COMPONENTE 'dynamic' AHORA USA NUESTRO NUEVO COMPONENTE DE CARGA
const DynamicMapContainer = dynamic(
  () => import('./MapContainer'),
  {
    loading: () => <MapLoadingSkeleton />, // Usamos el componente en lugar de la función anónima.
    ssr: false, // El mapa solo funciona en el cliente.
  }
);

interface NetworkClientProps {
  profiles: PublicProfile[];
  errorMessage?: string;
}

export function NetworkClient({ profiles, errorMessage }: NetworkClientProps) {
  const [selectedProfile, setSelectedProfile] = useState<PublicProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredProfiles = useMemo(() => {
    if (!searchTerm) return profiles;
    return profiles.filter(p => 
      p.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.services?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [profiles, searchTerm]);

  if (errorMessage) {
    return <div className="p-8 text-red-500 text-center">{errorMessage}</div>;
  }

  return (
    <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 h-full flex flex-col glass-effect rounded-lg">
        <ProfileList
          profiles={filteredProfiles}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onSelectProfile={setSelectedProfile}
          selectedProfileId={selectedProfile?.id}
        />
      </div>
      <div className="lg:col-span-2 h-full rounded-lg overflow-hidden">
        <DynamicMapContainer
          profiles={filteredProfiles}
          selectedProfile={selectedProfile}
          onSelectProfile={setSelectedProfile}
        />
      </div>
    </div>
  );
}