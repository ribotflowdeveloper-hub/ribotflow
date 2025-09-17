"use client";

import React from 'react';

import { Building2 } from 'lucide-react';
import type { PublicProfile } from '../types';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

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
      className={`p-4 mb-2 rounded-lg cursor-pointer ... ${
        isSelected ? 'bg-purple-800/50 ...' : 'bg-gray-800/50 ...'
      }`}
    >
      <div className="flex items-center gap-4">
        {profile.logo_url ? (
          <Image 
            src={profile.logo_url} 
            // ✅ SOLUCIÓN: Proporcionamos un string vacío ('') si el nombre es nulo.
            alt={t('logoAltText', { companyName: profile.company_name || '' })}
            width={48} 
            height={48}
            className="rounded-full object-cover bg-gray-700"
          />
        ) : (
          <div className="w-12 h-12 rounded-full ...">
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