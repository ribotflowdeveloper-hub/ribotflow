"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Loader2, Upload, User, Building, Settings } from "lucide-react";

// Imports de UI
import { Button } from "@/components/ui/button";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ModuleCard } from '@/components/shared/ModuleCard';
import { LanguageSwitcher } from '../../customization/_components/LanguageSwitcher';
import { ThemeSwitcher } from '../../customization/_components/ThemeSwitcher'; 

// Imports de Lògica
import type { Profile, Team } from '@/types/settings';
import { hasPermission, PERMISSIONS, Role } from '@/lib/permissions/permissions.config';
import { useProfileForm } from '../_hooks/useProfileForm'; // ⭐️ Importem el nou Hook

interface ProfileFormProps {
  email: string;
  profile: Profile;
  team: Team | null;
  role: Role | null;
}

export function ProfileForm({ email, profile, team, role }: ProfileFormProps) {
  const t = useTranslations('SettingsPage.SettingsProfile');
  
  // ⭐️ Tota la lògica complexa ara viu dins d'aquest hook
  const {
    isProfilePending,
    isTeamPending,
    isUploading,
    logoUrl,
    handleLogoUpload,
    handleUpdateProfile,
    handleUpdateTeam
  } = useProfileForm({ team });

  const canManageTeam = hasPermission(role, PERMISSIONS.MANAGE_TEAM_PROFILE);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start"
    >
      {/* --- Columna Esquerra --- */}
      <div className="lg:col-span-2 space-y-8">
        <form action={handleUpdateProfile}>
          <ModuleCard title={t('personalProfile.title')} icon={User} isCollapsible={false}>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('personalProfile.emailLabel')}</Label>
                <Input type="email" value={email} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">{t('personalProfile.fullNameLabel')}</Label>
                <Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('personalProfile.phoneLabel')}</Label>
                <Input id="phone" name="phone" defaultValue={profile?.phone || ''} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="job_title">{t('personalProfile.jobTitleLabel')}</Label>
                <Input id="job_title" name="job_title" defaultValue={profile?.job_title || ''} placeholder={t('personalProfile.jobTitlePlaceholder')} />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isProfilePending}>{isProfilePending ? t('personalProfile.savingButton') : t('personalProfile.saveButton')}</Button>
            </div>
          </ModuleCard>
        </form>

        <ModuleCard title={t('preferences.title')} icon={Settings} isCollapsible={false}>
          {/* ✅ Aquest és el bloc que es va trencar. Ara és correcte. */}
          <div className="space-y-6">
            <div>
              <Label className="text-sm font-medium">{t('preferences.themeTitle')}</Label>
              <p className="text-sm text-muted-foreground mb-3">{t('preferences.themeDescription')}</p>
              <ThemeSwitcher />
            </div>
            <div>
              <Label className="text-sm font-medium">{t('preferences.languageTitle')}</Label>
              <p className="text-sm text-muted-foreground mb-3">{t('preferences.languageDescription')}</p>
              <LanguageSwitcher />
            </div>
          </div>
        </ModuleCard>
      </div>

      {/* --- Columna Dreta --- */}
      <div className="lg:col-span-3">
        {canManageTeam && team && (
          <form action={handleUpdateTeam}>
            <ModuleCard title={t('companyProfile.title')} icon={Building} isCollapsible={false}>
              <p className="text-sm text-muted-foreground mb-6">{t('companyProfile.description')}</p>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ... Tots els altres camps (nom, tax_id, email, etc) ... */}
                  <div className="space-y-2">
                    <Label htmlFor="name">{t('companyProfile.nameLabel')}</Label>
                    <Input id="name" name="name" defaultValue={team.name || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tax_id">{t('companyProfile.taxIdLabel')}</Label>
                    <Input id="tax_id" name="tax_id" defaultValue={team.tax_id || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_email">{t('companyProfile.emailLabel')}</Label>
                    <Input id="company_email" name="company_email" type="email" defaultValue={team.email || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company_phone">{t('companyProfile.phoneLabel')}</Label>
                    <Input id="company_phone" name="company_phone" defaultValue={team.phone || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sector">{t('companyProfile.sectorLabel')}</Label>
                    <Input id="sector" name="sector" defaultValue={team.sector || ''} placeholder={t('companyProfile.sectorPlaceholder')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">{t('companyProfile.countryLabel')}</Label>
                    <Input id="country" name="country" defaultValue={team.country || ''} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="street">{t('companyProfile.addressLabel')}</Label>
                    <Input id="street" name="street" defaultValue={team.street || ''} placeholder={t('companyProfile.addressPlaceholder')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="city">{t('companyProfile.cityLabel')}</Label>
                    <Input id="city" name="city" defaultValue={team.city || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postal_code">{t('companyProfile.postalCodeLabel')}</Label>
                    <Input id="postal_code" name="postal_code" defaultValue={team.postal_code || ''} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="website">{t('companyProfile.websiteLabel')}</Label>
                    <Input id="website" name="website" type="url" defaultValue={team.website || ''} placeholder={t('companyProfile.websitePlaceholder')} />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="summary">{t('companyProfile.summaryLabel')}</Label>
                    <Textarea id="summary" name="summary" defaultValue={team.summary || ''} placeholder={t('companyProfile.summaryPlaceholder')} rows={3} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('companyProfile.logoLabel')}</Label>
                  <div className="flex items-center gap-4">
                    {/* Aquest 'Image' ara s'actualitzarà en temps real gràcies a l'estat 'logoUrl' del hook */}
                    {logoUrl ? <Image src={logoUrl} alt="Logo" width={56} height={56} className="object-contain rounded-lg border p-1 bg-white" /> : <div className="h-14 w-14 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">Logo</div>}
                    <Button asChild variant="outline">
                      <label htmlFor="logo-upload" className="cursor-pointer">
                        {/* ✅ Aquest és l'altre bloc que es va trencar. Ara és correcte. */}
                        {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} {t('companyProfile.changeLogoButton')}
                      </label>
                    </Button>
                    <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                  </div>
                </div>
              </div>
              <div className="mt-8 flex justify-end">
                <Button type="submit" disabled={isTeamPending}>{isTeamPending ? t('companyProfile.savingButton') : t('companyProfile.saveButton')}</Button>
              </div>
            </ModuleCard>
          </form>
        )}
      </div>
    </motion.div>
  );
}