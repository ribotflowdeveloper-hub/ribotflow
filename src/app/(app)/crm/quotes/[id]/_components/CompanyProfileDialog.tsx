// Ruta del fitxer: src/app/(app)/crm/quotes/[id]/_components/CompanyProfileDialog.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { updateCompanyProfileAction } from '../actions';
import type { CompanyProfile } from '../page';

type EditableProfile = Partial<CompanyProfile>;

export const CompanyProfileDialog = ({ open, onOpenChange, profile, onProfileUpdate }: {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    profile: CompanyProfile | null; // Permetem que el perfil inicial pugui ser null
    onProfileUpdate: (newProfile: CompanyProfile) => void;
}) => {
    const [localProfile, setLocalProfile] = useState<EditableProfile | null>(profile);
    const [isSaving, startSaveTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => { setLocalProfile(profile); }, [profile]);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // Afegim una comprovació per a localProfile i profile
        if (!file || !localProfile || !profile?.id) return;

        setIsUploading(true);
        const filePath = `${profile.id}/logo-${Date.now()}`;
        const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut pujar el logo.' });
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
            setLocalProfile(p => p ? { ...p, logo_url: data.publicUrl } : null);
        }
        setIsUploading(false);
    };

    const handleSaveProfile = () => {
        // Comprovem tant el perfil original com el local
        if (!profile?.id || !profile?.user_id || !localProfile) {
            toast({ variant: 'destructive', title: 'Error', description: 'Falten dades essencials del perfil.' });
            return;
        }

        startSaveTransition(async () => {
            const profileToSend: CompanyProfile = {
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
                toast({ title: 'Èxit!', description: result.message });
                onProfileUpdate(result.updatedProfile);
                onOpenChange(false);
            } else {
                toast({ variant: 'destructive', title: 'Error', description: result.message });
            }
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="glass-effect">
                <DialogHeader>
                    <DialogTitle>Dades de la Teva Empresa</DialogTitle>
                    <DialogDescription>Aquesta informació apareixerà als teus pressupostos i factures.</DialogDescription>
                </DialogHeader>
                {/* Afegim una comprovació per no renderitzar res si no hi ha perfil local */}
                {localProfile && (
                    <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                        <div>
                            <Label>Logo de l'Empresa</Label>
                            <div className="mt-1 flex items-center gap-4">
                                {/* ✅ APLIQUEM ?. PER ACCEDIR DE FORMA SEGURA */}
                                {localProfile?.logo_url ? <img src={localProfile.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg bg-white/10 p-1" /> : <div className="h-16 w-16 bg-muted rounded-lg"/>}
                                <Button asChild variant="outline">
                                    <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                                        {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4" />} Pujar Logo
                                    </label>
                                </Button>
                                <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                            </div>
                        </div>
                        {/* ✅ APLIQUEM ?. A TOTS ELS CAMPS DEL FORMULARI */}
                        <div><Label htmlFor="company_name">Nom de l'Empresa</Label><Input id="company_name" value={localProfile?.company_name || ''} onChange={(e) => setLocalProfile(p => p ? ({...p, company_name: e.target.value}) : null)} /></div>
                        <div><Label htmlFor="company_tax_id">NIF/CIF</Label><Input id="company_tax_id" value={localProfile?.company_tax_id || ''} onChange={(e) => setLocalProfile(p => p ? ({...p, company_tax_id: e.target.value}) : null)} /></div>
                        <div><Label htmlFor="company_address">Adreça</Label><Input id="company_address" value={localProfile?.company_address || ''} onChange={(e) => setLocalProfile(p => p ? ({...p, company_address: e.target.value}) : null)} /></div>
                        <div><Label htmlFor="company_email">Email</Label><Input id="company_email" type="email" value={localProfile?.company_email || ''} onChange={(e) => setLocalProfile(p => p ? ({...p, company_email: e.target.value}) : null)} /></div>
                        <div><Label htmlFor="company_phone">Telèfon</Label><Input id="company_phone" value={localProfile?.company_phone || ''} onChange={(e) => setLocalProfile(p => p ? ({...p, company_phone: e.target.value}) : null)} /></div>
                    </div>
                )}
                <DialogFooter>
                    <Button onClick={handleSaveProfile} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Desar Canvis
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};