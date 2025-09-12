// src/app/_components/network/ProfileList.tsx
import { Search } from 'lucide-react';
import { PublicProfile } from '@/types';
import ProfileCard from './ProfileCard';

interface ProfileListProps {
  profiles: PublicProfile[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onSelectProfile: (profile: PublicProfile) => void;
  selectedProfileId?: string;
}

export default function ProfileList({ profiles, searchTerm, onSearchChange, onSelectProfile, selectedProfileId }: ProfileListProps) {
  return (
    <>
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold mb-4">Xarxa Professional</h2>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca per nom o servei..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-md pl-10 pr-4 py-2 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>
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
          <p className="text-center text-gray-400 p-4">No s'han trobat resultats.</p>
        )}
      </div>
    </>
  );
}