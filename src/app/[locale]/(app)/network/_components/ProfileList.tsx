import { Search } from 'lucide-react';
import type { PublicProfile } from '../types'; // O la ruta relativa correcta a 'network/types.ts'
import ProfileCard from './ProfileCard';
import { useTranslations } from 'next-intl'; // ✅ Importem el hook

// Definim les propietats que rep el component de la llista.
interface ProfileListProps {
  profiles: PublicProfile[];            // L'array complet de perfils a mostrar.
  searchTerm: string;                   // El text actual del camp de cerca.
  onSearchChange: (term: string) => void; // Funció que s'executa quan l'usuari escriu al cercador.
  onSelectProfile: (profile: PublicProfile) => void; // Funció que s'executa en clicar una targeta.
  selectedProfileId?: string;           // L'ID del perfil seleccionat actualment (opcional).
}

/**
 * Aquest component gestiona la part esquerra de la interfície: la llista de perfils i el cercador.
 * És un "component controlat", el que significa que l'estat (com el text de cerca o quin perfil
 * està seleccionat) es gestiona en un component de nivell superior (el pare).
 */
export default function ProfileList({ profiles, searchTerm, onSearchChange, onSelectProfile, selectedProfileId }: ProfileListProps) {
  const t = useTranslations('NetworkPage'); // ✅ Cridem el hook

  return (
    <>
      {/* Capçalera amb el títol i el camp de cerca */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4">Xarxa Professional</h2>
        <div className="relative">
          <Search className="absolute  top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')} 
            // El valor i el canvi de l'input estan controlats per les 'props' del component pare.
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>
      
      {/* Llista de perfils amb scroll */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
        {/* Renderitzat condicional: si hi ha perfils, els mostrem. */}
        {profiles.length > 0 ? (
          // Aquesta és la manera estàndard a React de renderitzar una llista d'elements.
          // Fem un 'map' sobre l'array de 'profiles' i per a cada un, creem un component 'ProfileCard'.
          profiles.map(profile => (
            <ProfileCard
              // La 'key' és molt important per a React. Ajuda a optimitzar el renderitzat de llistes.
              // Ha de ser un valor únic per a cada element.
              key={profile.id}
              profile={profile}
              // Passem les dades i funcions necessàries al component fill.
              isSelected={profile.id === selectedProfileId}
              onClick={() => onSelectProfile(profile)}
            />
          ))
        ) : (
          // Si l'array 'profiles' està buit, mostrem un missatge a l'usuari.
          <p className="text-center text-gray-400 p-4">{t('noResults')}</p> /* ✅ Text traduït */
        )}
      </div>
    </>
  );
}