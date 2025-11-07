import type { MapTeam } from '../../types'; // ✅ Canviat a MapTeam
import ProfileCard from './ProfileCard';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';

interface ProfileListProps {
    profiles: MapTeam[]; // ✅ Canviat a MapTeam
    onSelectProfile: (profile: MapTeam) => void; // ✅ Canviat a MapTeam
    selectedProfileId?: string;
    className?: string; 
    // Traiem searchTerm i onSearchChange, ja que són al component pare
}

export default function ProfileList({
    profiles,
    onSelectProfile,
    selectedProfileId,
    className
}: ProfileListProps) {
    const t = useTranslations('NetworkPage');
    
    return (
        <div className={cn(
            "flex-1 overflow-y-auto custom-scrollbar p-2",
            className
        )}>
            {profiles.length > 0 ? (
                profiles.map(profile => (
                    <ProfileCard
                        key={profile.id}
                        // ✅ El component ProfileCard ha d'acceptar MapTeam 
                        // o hem d'adaptar les dades aquí. Assumim que ProfileCard
                        // només necessita 'id', 'name', 'logo_url', 'sector'
                        profile={{ 
                            id: profile.id, 
                            name: profile.name, 
                            logo_url: profile.logo_url,
                            sector: profile.services ? profile.services.join(', ') : null, // Adaptem 'services' a 'sector'
                            latitude: profile.latitude,
                            longitude: profile.longitude
                        }}
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