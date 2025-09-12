// src/app/_components/network/ProfileCard.tsx
import { Building2 } from 'lucide-react';
import { PublicProfile } from '@/types';

interface ProfileCardProps {
  profile: PublicProfile;
  isSelected: boolean;
  onClick: () => void;
}

export default function ProfileCard({ profile, isSelected, onClick }: ProfileCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200 ${
        isSelected ? 'bg-purple-800/50 ring-2 ring-purple-500' : 'bg-gray-800/50 hover:bg-gray-700/50'
      }`}
    >
      <div className="flex items-center gap-4">
        {profile.logo_url ? (
          <img src={profile.logo_url} alt={profile.company_name} className="w-12 h-12 rounded-full object-cover bg-gray-700" />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div>
          <h3 className="font-bold">{profile.company_name}</h3>
          <p className="text-sm text-gray-400 truncate">{profile.summary}</p>
        </div>
      </div>
    </div>
  );
}