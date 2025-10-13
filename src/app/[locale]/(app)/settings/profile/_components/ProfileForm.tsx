"use client";

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { toast } from 'sonner';
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { createClient } from '@/lib/supabase/client';
import { updateUserProfileAction, updateTeamAction } from '../actions';
import type { Profile, Team } from '@/types/settings';

import { hasPermission, PERMISSIONS } from '@/lib/permissions.config';

interface ProfileFormProps {
    email: string;
    profile: Profile;
    team: Team | null;
    role: 'owner' | 'admin' | 'member' | null;
}

export function ProfileForm({ email, profile, team, role }: ProfileFormProps) {
    const [isProfilePending, startProfileTransition] = useTransition();
    const [isTeamPending, startTeamTransition] = useTransition();
    const [isUploading, setIsUploading] = useState(false);
    const [logoUrl, setLogoUrl] = useState(team?.logo_url || null);

    const canManageTeam = hasPermission(role, PERMISSIONS.MANAGE_TEAM_PROFILE);

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !team) return;

        setIsUploading(true);
        const filePath = `${team.id}/logo-${Date.now()}`;
        const { error } = await createClient().storage.from('logos').upload(filePath, file, { upsert: true });

        if (error) {
            toast.error("Error al pujar el logo", { description: error.message });
        } else {
            const { data } = createClient().storage.from('logos').getPublicUrl(filePath);
            setLogoUrl(data.publicUrl);
            toast.success("Logo pujat correctament");
        }
        setIsUploading(false);
    };

    const handleUpdateProfile = (formData: FormData) => {
        startProfileTransition(async () => {
            const result = await updateUserProfileAction(formData);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    const handleUpdateTeam = (formData: FormData) => {
        startTeamTransition(async () => {
            formData.set('logo_url', logoUrl || '');
            const result = await updateTeamAction(formData);
            if (result.success) toast.success(result.message);
            else toast.error(result.message);
        });
    };

    return (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
            {/* --- Formulari de Perfil Personal --- */}
            <form action={handleUpdateProfile}>
                <Card>
                    <CardHeader>
                        <CardTitle>El Meu Perfil</CardTitle>
                        <CardDescription>Aquestes són les teves dades personals.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* ✅ MILLORA: Graella de 2 columnes per al perfil */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input type="email" value={email} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nom i Cognoms</Label>
                                <Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telèfon Personal</Label>
                                <Input id="phone" name="phone" defaultValue={profile?.phone || ''} />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="job_title">Càrrec</Label>
                                <Input id="job_title" name="job_title" defaultValue={profile?.job_title || ''} placeholder="Ex: Director Comercial" />
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" disabled={isProfilePending}>{isProfilePending ? "Desant..." : "Desar Perfil"}</Button>
                    </CardFooter>
                </Card>
            </form>

            {/* --- Formulari de l'Empresa --- */}
            {canManageTeam && team && (
                <form action={handleUpdateTeam}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Dades de l'Empresa</CardTitle>
                            <CardDescription>Aquesta informació s'utilitzarà a les teves factures i pressupostos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Nom de l'empresa</Label>
                                    <Input id="name" name="name" defaultValue={team.name || ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="tax_id">NIF/CIF</Label>
                                    <Input id="tax_id" name="tax_id" defaultValue={team.tax_id || ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email de l'empresa</Label>
                                    <Input id="email" name="email" type="email" defaultValue={team.email || ''} />
                                </div>

                                {/* ✅ segona graella */}

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Telèfon de l'empresa</Label>
                                    <Input id="phone" name="phone" defaultValue={team.phone || ''} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="sector">Sector</Label>
                                    <Input id="sector" name="sector" defaultValue={team.sector || ''} placeholder="Ex: Tecnologia, Construcció" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="country">País</Label>
                                    <Input id="country" name="country" defaultValue={team.country || ''} placeholder="País" />
                                </div>


                                {/* ✅ tercera graella */}
                                <div className="space-y-2">
                                    <Label htmlFor="street">Carrer</Label>
                                    <Input id="street" name="street" defaultValue={team.street || ''} placeholder="Carrer, Número, Ciutat, CP, País" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="postal_code">Codi Postal</Label>
                                    <Input id="postal_code" name="postal_code" defaultValue={team.postal_code || ''} placeholder="Codi Postal" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="city">Població</Label>
                                    <Input id="city" name="city" defaultValue={team.city || ''} placeholder="Població" />
                                </div>



                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="website">Pàgina web</Label>
                                    <Input id="website" name="website" type="url" defaultValue={team.website || ''} placeholder="https://elteudomini.com" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label htmlFor="summary">Descripció curta</Label>
                                    <Textarea id="summary" name="summary" defaultValue={team.summary || ''} placeholder="Una breu descripció del que fa la teva empresa." />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <Label>Logo</Label>
                                    <div className="mt-2 flex items-center gap-4">
                                        {logoUrl ? <Image src={logoUrl} alt="Logo" width={64} height={64} className="object-contain rounded-lg border p-1" /> : <div className="h-16 w-16 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">Logo</div>}
                                        <Button asChild variant="outline">
                                            <label htmlFor="logo-upload" className="cursor-pointer">
                                                {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Cambiar Logo
                                            </label>
                                        </Button>
                                        <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={isTeamPending}>{isTeamPending ? "Desant..." : "Desar Dades de l'Empresa"}</Button>
                        </CardFooter>
                    </Card>
                </form>
            )}
        </motion.div>
    );
}