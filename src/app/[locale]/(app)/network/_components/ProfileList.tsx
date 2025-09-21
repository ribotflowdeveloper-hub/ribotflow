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
  const t = useTranslations('NetworkPage');

  return (
      // ✅ NOU: El contenidor principal ara és un flex-col que omple l'alçada.
      <div className="flex flex-col h-full glass-effect rounded-lg">
          {/* Capçalera amb el títol i el camp de cerca (no fa scroll) */}
          <div className="p-4 border-b border-border flex-shrink-0">
              <h2 className="text-xl font-bold mb-4">{t('networkTitle')}</h2>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                      type="text"
                      placeholder={t('searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="w-full bg-background border border-border rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary focus:outline-none"
                  />
              </div>
          </div>
          
          {/* ✅ NOU: Aquesta és l'àrea que farà scroll. */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
              {profiles.length > 0 ? (
                  profiles.map(profile => (
                      <ProfileCard
                          key={profile.id}
                          profile={profile}
                          isSelected={profile.id === selectedProfileId}
                          onClick={() => onSelectProfile(profile)}
                      />
                  ))
              ) : (
                  <p className="text-center text-muted-foreground p-4">{t('noResults')}</p>
              )}
          </div>
      </div>
  );
}