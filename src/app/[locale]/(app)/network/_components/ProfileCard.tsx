"use client";

import { Building2 } from 'lucide-react';
import type { PublicProfileListItem } from '../types';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils/utils';

interface ProfileCardProps {
    profile: PublicProfileListItem;
    isSelected: boolean;
    onClick: () => void;
}

export default function ProfileCard({ profile, isSelected, onClick }: ProfileCardProps) {
    const t = useTranslations('NetworkPage');
    return (
        <div onClick={onClick} className={cn('p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200', isSelected ? 'bg-primary/20 ring-2 ring-primary' : 'bg-card hover:bg-muted')}>
            <div className="flex items-center gap-4">
                {profile.logo_url ? (
                    <Image src={profile.logo_url} alt={t('logoAltText', { companyName: profile.name })} width={48} height={48} className="rounded-full object-cover bg-muted" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-gray-400" />
                    </div>
                )}
                <div className="min-w-0">
                    <h3 className="font-bold truncate">{profile.name}</h3>
                    {profile.sector && <p className="text-sm text-primary font-medium truncate">{profile.sector}</p>}
                </div>
            </div>
        </div>
    );
}