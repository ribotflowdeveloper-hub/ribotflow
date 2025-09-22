/**
 * @file ProfileForm.tsx
 * @summary Aquest fitxer conté el component de client que gestiona tota la interfície interactiva
 * per a l'edició del perfil de l'usuari. S'encarrega de renderitzar el formulari, gestionar
 * l'estat dels camps, la pujada del logo i la comunicació amb les Server Actions per desar els canvis.
 */

"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload } from "lucide-react";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { updateProfileAction, updateProfileVisibilityAction } from '../actions';
import { useTranslations } from 'next-intl';

// Definim una interfície completa per a l'objecte de perfil.
interface Profile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  summary: string | null;
  company_phone: string | null;
  services: string[] | null;
  street: string | null;
  city: string | null;
  postal_code: string | null;
  region: string | null;
  country: string | null;
  is_public_profile: boolean | null;
  company_tax_id: string | null;
  company_address: string | null;
  company_email: string | null;
  logo_url: string | null;
}

interface ProfileFormProps {
  profile: Profile;
  email: string;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const t = useTranslations('SettingsPage.SettingsProfile');
  const supabase = createClient()
;
  const [isPending, startTransition] = useTransition(); // Hook per a l'estat de càrrega principal del formulari.
  const [isSwitchSaving, setIsSwitchSaving] = useState(false); // Estat de càrrega específic per a l'interruptor d'autodesat.
  const [isUploading, setIsUploading] = useState(false); // Estat de càrrega per a la pujada del logo.
  const [localProfile, setLocalProfile] = useState<Profile>(profile); // Estat local per a una gestió més flexible del formulari, especialment per al logo.

  // Aquest efecte sincronitza l'estat local si les dades inicials canvien (ex: després d'un 'router.refresh()').
  useEffect(() => {
    setLocalProfile(profile);
  }, [profile]);

  // Gestor de canvis genèric per als camps d'input i textarea.
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setLocalProfile(prev => ({ ...prev, [name]: value }));
  };

  /**
   * @summary Puja el logo a Supabase Storage i actualitza l'estat local amb la nova URL.
   */
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const filePath = `${profile.id}/logo-${Date.now()}`;
    const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });

    if (error) {
      toast.error(t('toastError'), { description: t('toastLogoUploadError') });
    } else {
      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      // Actualitzem l'estat local amb la nova URL, que es mostrarà a la previsualització.
      setLocalProfile(p => ({ ...p, logo_url: data.publicUrl }));
      toast.success(t('toastLogoUploadSuccess'), { description: t('toastLogoUploadSuccessDesc') });
    }
    setIsUploading(false);
  };

  /**
   * @summary Gestor per a l'enviament del formulari principal. Crida a la Server Action 'updateProfileAction'.
   */
  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      // Injectem la URL del logo (que està a l'estat local) al FormData abans d'enviar-lo a l'acció.
      formData.set('logo_url', localProfile.logo_url || '');
      const result = await updateProfileAction(formData);
      if (result.success) {
        toast.success(t('toastSuccess'), { description: result.message });
      } else {
        toast.error(t('toastError'), { description: result.message });
      }
    });
  };

  /**
   * @summary Gestor per a l'autodesat de l'interruptor de visibilitat. Crida a 'updateProfileVisibilityAction'.
   */
  const handleVisibilityChange = async (isChecked: boolean) => {
    setIsSwitchSaving(true);
    const result = await updateProfileVisibilityAction(isChecked);
    if (result.success) {
      toast.success(t('toastVisibilitySuccess'), { description: t('visibilityUpdateMessage', { status }) });
    } else {
      toast.error(t('toastError'), { description: result.message });
    }
    setIsSwitchSaving(false);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <form action={handleSubmit} className="space-y-8">

        <Card>
          <CardHeader>
            <CardTitle>{t('generalCardTitle')}</CardTitle>
            <CardDescription>{t('generalCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="full_name">{t('fullNameLabel')}</Label>
                <Input id="full_name" name="full_name" type="text" defaultValue={profile.full_name || ''} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="company_name">{t('companyNameLabel')}</Label>
                <Input id="company_name" name="company_name" type="text" defaultValue={profile.company_name || ''} className="mt-2" />
              </div>
            </div>
            <div>
              <Label htmlFor="summary">{t('summaryLabel')}</Label>
              <Textarea id="summary" name="summary" defaultValue={profile.summary || ''} placeholder={t('summaryPlaceholder')} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="services">{t('servicesLabel')}</Label>
              <Input id="services" name="services" type="text" defaultValue={profile.services?.join(', ') || ''} placeholder={t('servicesPlaceholder')} className="mt-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('contactCardTitle')}</CardTitle>
            <CardDescription>{t('contactCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label htmlFor="company_phone">{t('phoneLabel')}</Label>
              <Input id="company_phone" name="company_phone" type="tel" defaultValue={profile.company_phone || ''} className="mt-2" />
            </div>
            <div>
              <Label htmlFor="street">{t('streetLabel')}</Label>
              <Input id="street" name="street" type="text" defaultValue={profile.street || ''} className="mt-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="city">{t('cityLabel')}</Label>
                <Input id="city" name="city" type="text" defaultValue={profile.city || ''} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="postal_code">{t('postalCodeLabel')}</Label>
                <Input id="postal_code" name="postal_code" type="text" defaultValue={profile.postal_code || ''} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="region">{t('regionLabel')}</Label>
                <Input id="region" name="region" type="text" defaultValue={profile.region || ''} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="country">{t('countryLabel')}</Label>
                <Input id="country" name="country" type="text" defaultValue={profile.country || ''} className="mt-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('visibilityCardTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4 rounded-lg border border-border p-4">
              {isSwitchSaving && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
              <Switch
                id="is_public_profile"
                name="is_public_profile"
                defaultChecked={!!profile.is_public_profile}
                // ✅ NOU: Connectem la funció d'autodesat
                onCheckedChange={handleVisibilityChange}
                disabled={isSwitchSaving}
              />
              <div className="space-y-0.5">
                <Label htmlFor="is_public_profile" className="text-base font-medium">{t('publicProfileLabel')}</Label>
                <p className="text-sm text-muted-foreground">
                  {t('publicProfileDescription')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('billingCardTitle')}</CardTitle>
            <CardDescription>{t('billingCardDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="company_tax_id">{t('taxIdLabel')}</Label>
                <Input id="company_tax_id" name="company_tax_id" type="text" value={localProfile.company_tax_id || ''} onChange={handleInputChange} className="mt-2" />
              </div>
              <div>
                <Label htmlFor="company_email">{t('companyEmailLabel')}</Label>
                <Input id="company_email" name="company_email" type="email" value={localProfile.company_email || ''} onChange={handleInputChange} className="mt-2" />
              </div>
            </div>
            <div>
              <Label htmlFor="company_address">{t('fiscalAddressLabel')}</Label>
              <Input id="company_address" name="company_address" type="text" value={localProfile.company_address || ''} onChange={handleInputChange} className="mt-2" />
            </div>
            <div>
              <Label>{t('logoLabel')}</Label>
              <div className="mt-2 flex items-center gap-4">
                {localProfile.logo_url ? (
                  <Image src={localProfile.logo_url} alt="Logo" width={64} height={64} className="object-contain rounded-lg bg-white/10 p-1" />
                ) : (
                  <div className="h-16 w-16 bg-muted rounded-lg" />
                )}
                <Button asChild variant="outline">
                  <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                    {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4" />} {t('changeLogoButton')}
                  </label>
                </Button>
                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="flex justify-end pt-4">
          <Button type="submit" disabled={isPending}>
            {isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isPending ? t('savingButton') : (isUploading ? t('uploadingLogoButton') : t('saveChangesButton'))}          </Button>
        </div>
      </form>
    </motion.div>
  );
}

