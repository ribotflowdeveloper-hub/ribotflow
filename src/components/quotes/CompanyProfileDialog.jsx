// ============================================================================
// Fitxer: src/components/quotes/CompanyProfileDialog.jsx
// ============================================================================
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Loader2, Upload } from 'lucide-react';

export const CompanyProfileDialog = ({ open, onOpenChange, profile, onProfileUpdate }) => {
    const [localProfile, setLocalProfile] = useState(profile || {});
    const [isUploading, setIsUploading] = useState(false);
    const { user } = useAuth();
    const { toast } = useToast();

    useEffect(() => { setLocalProfile(profile || {}); }, [profile]);

    const handleLogoUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setIsUploading(true);
        const filePath = `${user.id}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from('logos').upload(filePath, file);
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'No s\'ha pogut pujar el logo.' });
        } else {
            const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
            setLocalProfile(p => ({ ...p, logo_url: data.publicUrl }));
        }
        setIsUploading(false);
    };

    const handleSaveProfile = async () => {
        const { data, error } = await supabase.from('profiles').upsert({ ...localProfile, id: user.id }).select().single();
        if (error) {
            toast({ variant: 'destructive', title: 'Error', description: `No s'han pogut desar les dades: ${error.message}` });
        } else {
            toast({ title: 'Èxit!', description: 'Perfil d\'empresa actualitzat.' });
            onProfileUpdate(data);
            onOpenChange(false);
        }
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
                            {localProfile.logo_url ? <img src={localProfile.logo_url} alt="Logo" className="h-16 w-16 object-contain rounded-lg bg-white/10 p-1" /> : <div className="h-16 w-16 bg-muted rounded-lg"/>}
                            <Button asChild variant="outline"><label htmlFor="logo-upload" className="cursor-pointer flex items-center gap-2">{isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4" />} Pujar Logo</label></Button>
                            <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </div>
                    </div>
                    <div><Label>Nom de l'Empresa</Label><Input value={localProfile.company_name || ''} onChange={(e) => setLocalProfile(p => ({...p, company_name: e.target.value}))} /></div>
                    <div><Label>NIF/CIF</Label><Input value={localProfile.company_tax_id || ''} onChange={(e) => setLocalProfile(p => ({...p, company_tax_id: e.target.value}))} /></div>
                    <div><Label>Adreça</Label><Input value={localProfile.company_address || ''} onChange={(e) => setLocalProfile(p => ({...p, company_address: e.target.value}))} /></div>
                    <div><Label>Email de Contacte</Label><Input type="email" value={localProfile.company_email || ''} onChange={(e) => setLocalProfile(p => ({...p, company_email: e.target.value}))} /></div>
                    <div><Label>Telèfon de Contacte</Label><Input value={localProfile.company_phone || ''} onChange={(e) => setLocalProfile(p => ({...p, company_phone: e.target.value}))} /></div>
                </div>
                <DialogFooter><Button onClick={handleSaveProfile}>Desar Canvis</Button></DialogFooter>
            </DialogContent>
        </Dialog>
    );
};