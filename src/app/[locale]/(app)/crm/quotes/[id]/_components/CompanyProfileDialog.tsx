"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateCompanyProfileAction } from '../actions';
// ✅ Importem els tipus corregits des del fitxer central
import type { CompanyProfile as CompanyProfileType, CompanyProfileObject } from '@/types/crm';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

// ✅ Canviem el tipus EditableProfile per ser més estricte
type EditableProfile = Partial<CompanyProfileObject>;

export function CompanyProfileDialog({ open, onOpenChange, profile, onProfileUpdate }: {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    profile: CompanyProfileType;
    onProfileUpdate: (newProfile: CompanyProfileType) => void;
}) {
    const t = useTranslations('QuoteEditor');
    const [localProfile, setLocalProfile] = useState<EditableProfile>(profile || {});
    const [isSaving, startSaveTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const supabase = createClient()
;

    useEffect(() => { setLocalProfile(profile || {}); }, [profile]);

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

    /**
     * @summary Gestor per desar el perfil. Ara és més segur i net.
     */
    const handleSaveProfile = () => {
        // La comprovació es fa sobre el 'profile' original per assegurar que tenim les dades base
        if (!profile?.id || !profile.user_id) {
            toast.error(t('toast.errorTitle'), { description: t('toast.missingProfileData') });
            return;
        }

        startSaveTransition(async () => {
            // ✅ CORRECCIÓ: Construïm l'objecte a enviar de manera més segura.
            // Agafem totes les propietats de l'estat local i les combinem amb les IDs originals.
            const profileToSend: CompanyProfileObject = {
                id: profile.id,
                user_id: profile.user_id,
                company_name: localProfile.company_name || null,
                company_tax_id: localProfile.company_tax_id || null,
                company_address: localProfile.company_address || null,
                company_email: localProfile.company_email || null,
                company_phone: localProfile.company_phone || null,
                logo_url: localProfile.logo_url || null,
            };

            const result = await updateCompanyProfileAction(profileToSend);

            if (result.success && result.updatedProfile) {
                toast.success(t('toast.successTitle'), { description: result.message });
                onProfileUpdate(result.updatedProfile);
                onOpenChange(false);
            } else {
                toast.error(t('toast.errorTitle'), { description: result.message });
            }
        });
    };
    
    // Funció per gestionar els canvis als inputs de manera genèrica
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setLocalProfile(prev => ({ ...prev, [name]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            {/* ✅ CORRECCIÓN: Eliminamos 'glass-effect'. DialogContent ya es adaptable. */}
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
                                <Image
                                    src={localProfile.logo_url}
                                    alt={t('companyProfileDialog.logoAlt')}
                                    width={64} height={64}
                                    // ✅ CORRECCIÓN: Usamos 'bg-muted' para un fondo neutro
                                    className="object-contain rounded-lg bg-muted p-1"
                                />
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
                    <div><Label htmlFor="company_name">{t('companyProfileDialog.nameLabel')}</Label><Input id="company_name" name="company_name" value={localProfile.company_name || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="company_tax_id">{t('companyProfileDialog.taxIdLabel')}</Label><Input id="company_tax_id" name="company_tax_id" value={localProfile.company_tax_id || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="company_address">{t('companyProfileDialog.addressLabel')}</Label><Input id="company_address" name="company_address" value={localProfile.company_address || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="company_email">{t('companyProfileDialog.emailLabel')}</Label><Input id="company_email" name="company_email" type="email" value={localProfile.company_email || ''} onChange={handleInputChange} /></div>
                    <div><Label htmlFor="company_phone">{t('companyProfileDialog.phoneLabel')}</Label><Input id="company_phone" name="company_phone" value={localProfile.company_phone || ''} onChange={handleInputChange} /></div>
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