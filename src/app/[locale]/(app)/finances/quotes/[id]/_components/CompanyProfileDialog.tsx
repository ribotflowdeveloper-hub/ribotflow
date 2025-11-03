// /app/[locale]/(app)/finances/quotes/[id]/_components/CompanyProfileDialog.tsx (FITXER CORREGIT)
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

// ✅ CORRECCIÓ: Importem l'ACCIÓ des del fitxer d'accions
import { updateTeamProfileAction } from '../actions';
// ✅ CORRECCIÓ: Importem el TIPUS directament des del fitxer de tipus
import { type Team } from '@/types/finances/quotes';


export function CompanyProfileDialog({ open, onOpenChange, profile, onProfileUpdate }: {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    profile: Team | null;
    onProfileUpdate: (newProfile: Team) => void;
}) {
    const t = useTranslations('QuoteEditor');
    const [localProfile, setLocalProfile] = useState<Partial<Team>>({});
    const [isSaving, startSaveTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const supabase = createClient();

    useEffect(() => {
        if (profile) {
            setLocalProfile(profile);
        }
    }, [profile]);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !profile?.id) return;

        setIsUploading(true);
        const filePath = `${profile.id}/logo-${Date.now()}`;
        const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });

        if (error) {
            toast.error(t('toast.errorTitle'), { description: t('toast.logoUploadError') });
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
            setLocalProfile(p => ({ ...p, logo_url: data.publicUrl }));
        }
        setIsUploading(false);
    };

    const handleSaveProfile = () => {
        startSaveTransition(async () => {
            const result = await updateTeamProfileAction(localProfile);

            if (result.success && result.data) {
                toast.success(t('toast.successTitle'), { description: result.message });
                onProfileUpdate(result.data);
                onOpenChange(false);
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
        });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalProfile(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('companyProfileDialog.title')}</DialogTitle>
                    <DialogDescription>{t('companyProfileDialog.description')}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <Label>{t('companyProfileDialog.logoLabel')}</Label>
                        <div className="mt-1 flex items-center gap-4">
                            {localProfile.logo_url ? (
                                <Image src={localProfile.logo_url} alt={t('companyProfileDialog.logoAlt')} width={64} height={64} className="object-contain rounded-lg bg-muted p-1" />
                            ) : <div className="h-16 w-16 bg-muted rounded-lg" />}
                            <Button asChild variant="outline">
                                <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                                    {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4" />}
                                    {t('companyProfileDialog.uploadButton')}
                                </label>
                            </Button>
                            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                        </div>
                    </div>
                    {/* Camps del perfil */}
                    <div><Label htmlFor="name">{t('companyProfileDialog.nameLabel')}</Label><Input id="name" name="name" value={localProfile.name || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="tax_id">{t('companyProfileDialog.taxIdLabel')}</Label><Input id="tax_id" name="tax_id" value={localProfile.tax_id || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="address">{t('companyProfileDialog.addressLabel')}</Label><Input id="address" name="address" value={localProfile.address || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="email">{t('companyProfileDialog.emailLabel')}</Label><Input id="email" name="email" type="email" value={localProfile.email || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="phone">{t('companyProfileDialog.phoneLabel')}</Label><Input id="phone" name="phone" value={localProfile.phone || ''} onChange={handleInputChange} /></div>
                </div>
                <DialogFooter>
                    <Button onClick={() => onOpenChange(false)} variant="ghost">{t('buttons.cancel')}</Button>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('companyProfileDialog.saveButton')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};