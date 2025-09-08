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

// Definim un tipus per a les propietats parcials del perfil mentre s'edita
type EditableProfile = Partial<CompanyProfile>;

export const CompanyProfileDialog = ({ open, onOpenChange, profile, onProfileUpdate }: {
    open: boolean;
    onOpenChange: (isOpen: boolean) => void;
    profile: CompanyProfile;
    onProfileUpdate: (newProfile: CompanyProfile) => void;
}) => {
    // Tipem l'estat local per evitar errors i inicialitzem de forma segura
    const [localProfile, setLocalProfile] = useState<EditableProfile>(profile ?? {});
    const [isSaving, startSaveTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const { toast } = useToast();
    const supabase = createClient();

    useEffect(() => { setLocalProfile(profile ?? {}); }, [profile]);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        // ✅ CORRECCIÓ: Comprovem 'id' en lloc de 'user_id'
        if (!file || !profile?.id) return;

        setIsUploading(true);
        const filePath = `${profile.id}/logo-${Date.now()}`;
        const { error } = await supabase.storage.from('logos').upload(filePath, file, { upsert: true });

        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut pujar el logo.' });
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
            setLocalProfile(p => ({ ...p, logo_url: data.publicUrl }));
        }
        setIsUploading(false);
    };

    const handleSaveProfile = () => {
        // Assegurem que l'ID sempre estigui present per a l'acció
        if (!profile?.id) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha trobat l\'identificador del perfil.' });
            return;
        }

        startSaveTransition(async () => {
            // ✅ CORRECCIÓ: Enviem un objecte que compleix amb el tipus esperat per l'acció
            const profileToSend = { ...localProfile, id: profile.id };
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
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div>
                        <Label>Logo de l'Empresa</Label>
                        <div className="mt-1 flex items-center gap-4">
                            {localProfile?.logo_url ? <img src={localProfile.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg bg-white/10 p-1" /> : <div className="h-16 w-16 bg-muted rounded-lg"/>}
                            <Button asChild variant="outline">
                                <label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">
                                    {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4" />} Pujar Logo
                                </label>
                            </Button>
                            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                        </div>
                    </div>
                    {/* Fem servir 'localProfile?.prop' per a un accés segur a les dades */}
                    <div><Label htmlFor="company_name">Nom de l'Empresa</Label><Input id="company_name" value={localProfile?.company_name || ''} onChange={(e) => setLocalProfile(p => ({...p, company_name: e.target.value}))} /></div>
                    <div><Label htmlFor="company_tax_id">NIF/CIF</Label><Input id="company_tax_id" value={localProfile?.company_tax_id || ''} onChange={(e) => setLocalProfile(p => ({...p, company_tax_id: e.target.value}))} /></div>
                    <div><Label htmlFor="company_address">Adreça</Label><Input id="company_address" value={localProfile?.company_address || ''} onChange={(e) => setLocalProfile(p => ({...p, company_address: e.target.value}))} /></div>
                    <div><Label htmlFor="company_email">Email</Label><Input id="company_email" type="email" value={localProfile?.company_email || ''} onChange={(e) => setLocalProfile(p => ({...p, company_email: e.target.value}))} /></div>
                    <div><Label htmlFor="company_phone">Telèfon</Label><Input id="company_phone" value={localProfile?.company_phone || ''} onChange={(e) => setLocalProfile(p => ({...p, company_phone: e.target.value}))} /></div>
                </div>
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

