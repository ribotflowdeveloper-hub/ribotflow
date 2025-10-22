// src/app/[locale]/(app)/network/_components/ProfileList.tsx

import { Search } from 'lucide-react';
import type { PublicProfileListItem } from '../types';
import ProfileCard from './ProfileCard';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils'; // <-- Importa cn

interface ProfileListProps {
    profiles: PublicProfileListItem[];
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onSelectProfile: (profile: PublicProfileListItem) => void;
    selectedProfileId?: string;
    className?: string; // <-- Afegeix className com a prop opcional
}

export default function ProfileList({
    profiles,
    searchTerm,
    onSearchChange,
    onSelectProfile,
    selectedProfileId,
    className // <-- Rep la prop
}: ProfileListProps) {
    const t = useTranslations('NetworkPage');
    return (
        // ✅ Aplica la className rebuda a l'element arrel
        <div className={cn(
            "flex flex-col", // Treiem h-full d'aquí, ja que vindrà de fora
            // Eliminem glass-effect i rounded-lg d'aquí, s'aplicaran des del pare (NetworkClient)
            className // Aplica les classes passades (incloent h-full, glass-effect condicional, etc.)
        )}>
            {/* Capçalera amb títol i cerca */}
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
            {/* Llista scrollable */}
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