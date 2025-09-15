/**
 * @file CompanyProfileDialog.tsx
 * @summary Aquest fitxer defineix un diàleg modal reutilitzable per editar les dades de
 * facturació de l'empresa de l'usuari. Inclou la funcionalitat per pujar un logo
 * a Supabase Storage i crida a una Server Action per desar les dades.
 */

"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from "sonner";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client'; // Client de Supabase per a operacions del costat del client (com pujar arxius).
import { updateCompanyProfileAction } from '../actions';
import type { CompanyProfile } from '../page';
import Image from 'next/image';

// Tipus per a les dades editables del perfil. 'Partial' fa que totes les propietats siguin opcionals.
type EditableProfile = Partial<CompanyProfile>;

export const CompanyProfileDialog = ({ open, onOpenChange, profile, onProfileUpdate }: {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    profile: CompanyProfile | null;
    onProfileUpdate: (newProfile: CompanyProfile) => void; // Callback per notificar al component pare que les dades han canviat.
}) => {
    const [localProfile, setLocalProfile] = useState<EditableProfile | null>(profile); // Estat local per als canvis del formulari.
    const [isSaving, startSaveTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false); // Estat específic per a la pujada del logo.
    const supabase = createClient();

    // Sincronitzem l'estat local si les dades inicials (props) canvien.
    useEffect(() => { setLocalProfile(profile); }, [profile]);

    /**
     * @summary Gestor per a la pujada del logo. Puja l'arxiu a Supabase Storage i actualitza l'estat local amb la nova URL.
     */
    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !localProfile || !profile?.id) return;

        setIsUploading(true);
        const filePath = `${profile.id}/logo-${Date.now()}`;
        const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });

        if (error) {
            toast.error('Error', { description: 'No s\'ha pogut pujar el logo.' });
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
            setLocalProfile(p => p ? { ...p, logo_url: data.publicUrl } : null);
        }
        setIsUploading(false);
    };

    /**
     * @summary Gestor per desar el perfil complet. Prepara les dades i crida a la Server Action.
     */
    const handleSaveProfile = () => {
        if (!profile?.id || !profile?.user_id || !localProfile) {
            toast.error('Error', { description: 'Falten dades essencials del perfil.' });
            return;
        }

        startSaveTransition(async () => {
            // Assegurem que enviem un objecte complet i amb els tipus correctes a la Server Action.
            const profileToSend: CompanyProfile = {
                id: profile.id, user_id: profile.user_id,
                company_name: localProfile.company_name || null,
                company_tax_id: localProfile.company_tax_id || null,
                company_address: localProfile.company_address || null,
                company_email: localProfile.company_email || null,
                company_phone: localProfile.company_phone || null,
                logo_url: localProfile.logo_url || null,
            };
            
            const result = await updateCompanyProfileAction(profileToSend);
            
            if (result.success && result.updatedProfile) {
                toast.success('Èxit!', { description: result.message });
                onProfileUpdate(result.updatedProfile); // Notifiquem al component pare.
                onOpenChange(false); // Tanquem el diàleg.
            } else {
                toast.error('Error', { description: result.message });
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
                                {localProfile?.logo_url ? // ✅ CORRECCIÓ: Utilitzem el component Image de Next.js
                                <Image 
                                    src={localProfile.logo_url} 
                                    alt="Logo" 
                                    width={64} 
                                    height={64} 
                                    className="object-contain rounded-lg bg-white/10 p-1" 
                                /> : <div className="h-16 w-16 bg-muted rounded-lg"/>}
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