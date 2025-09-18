"use client";

import React from 'react';

import { Building2 } from 'lucide-react';
import type { PublicProfile } from '../types';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface ProfileCardProps {
  profile: PublicProfile;
  isSelected: boolean;
  onClick: () => void;
}

export default function ProfileCard({ profile, isSelected, onClick }: ProfileCardProps) {
  const t = useTranslations('NetworkPage');

  return (
    <div
      onClick={onClick}
      className={cn(
        'p-4 mb-2 rounded-lg cursor-pointer transition-all duration-200',
        isSelected 
          ? 'bg-primary/20 ring-2 ring-primary' 
          : 'bg-card hover:bg-muted'
      )}
    >
      <div className="flex items-center gap-4">
        {profile.logo_url ? (
          <Image 
            src={profile.logo_url} 
            // ✅ SOLUCIÓN: Proporcionamos un string vacío ('') si el nombre es nulo.
            alt={t('logoAltText', { companyName: profile.company_name || '' })}
            width={48} 
            height={48}
            className="rounded-full object-cover bg-muted"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="w-6 h-6 text-gray-400" />
          </div>
        )}
        <div>
          {/* Mostramos un texto alternativo si el nombre de la empresa no existe */}
          <h3 className="font-bold">{profile.company_name || profile.full_name}</h3>
          <p className="text-sm text-gray-400 truncate">{profile.summary}</p>
        </div>
      </div>
    </div>
  );
}