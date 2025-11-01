// src/app/[locale]/(app)/network/_components/ProfileList.tsx

import type { PublicProfileListItem } from '../../types';
import ProfileCard from './ProfileCard';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils'; // <-- Importa cn
import type { Dispatch, SetStateAction } from 'react'; // Importem tipus

interface ProfileListProps {
    profiles: PublicProfileListItem[];
    // Aquestes props les rep del NetworkClient (on hi ha la barra de cerca)
    searchTerm: string;
    onSearchChange: Dispatch<SetStateAction<string>>; 
    onSelectProfile: (profile: PublicProfileListItem) => void;
    selectedProfileId?: string;
    className?: string; 
}

export default function ProfileList({
    profiles,
    // No necessitem searchTerm ni onSearchChange aquí dins,
    // ja que la barra de cerca està al NetworkClient.
    // Les mantenim (o les podríem treure) per si decidim moure la cerca aquí.
    // De fet, per netejar, les traurem.
    onSelectProfile,
    selectedProfileId,
    className
}: ProfileListProps) {
    const t = useTranslations('NetworkPage');
    
    return (
        // Aquest component només gestiona la llista i l'scroll
        // La capçalera amb la cerca està ara al NetworkClient
        <div className={cn(
            "flex-1 overflow-y-auto custom-scrollbar p-2",
            className
        )}>
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
    );
}