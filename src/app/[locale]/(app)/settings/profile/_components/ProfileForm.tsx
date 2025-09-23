// /app/[locale]/settings/profile/_components/ProfileForm.tsx

"use client";

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Upload } from "lucide-react";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { updateUserProfileAction, updateTeamAction } from '../actions';
import type { Profile, Team } from '@/types/settings';
import { Textarea } from '@/components/ui/textarea';

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

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !team) return;

        setIsUploading(true);
        const filePath = `${team.id}/logo-${Date.now()}`;
        const { error } = await createClient().storage.from('logos').upload(filePath, file, { upsert: true });

        if (error) {
            toast.error("Error al subir el logo", { description: error.message });
        } else {
            const { data } = createClient().storage.from('logos').getPublicUrl(filePath);
            setLogoUrl(data.publicUrl);
            toast.success("Logo subido correctamente");
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
          {/* --- Formulari de Perfil Personal (VISIBLE PARA TODOS) --- */}
          <form action={handleUpdateProfile}>
              <Card>
                  <CardHeader>
                      <CardTitle>El Meu Perfil</CardTitle>
                      <CardDescription>Aquestes són les teves dades personals.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      <div><Label>Email</Label><Input type="email" value={email} disabled className="mt-1" /></div>
                      <div><Label htmlFor="full_name">Nom i Cognoms</Label><Input id="full_name" name="full_name" defaultValue={profile?.full_name || ''} className="mt-1" /></div>
                      <div><Label htmlFor="phone">Telèfon Personal</Label><Input id="phone" name="phone" defaultValue={profile?.phone || ''} className="mt-1" /></div>
                      <div><Label htmlFor="job_title">Càrrec</Label><Input id="job_title" name="job_title" defaultValue={profile?.job_title || ''} placeholder="Ex: Director Comercial" className="mt-1" /></div>
                  </CardContent>
                  <CardFooter>
                      <Button type="submit" disabled={isProfilePending}>{isProfilePending ? "Desant..." : "Desar Perfil"}</Button>
                  </CardFooter>
              </Card>
          </form>

          {/* --- Formulari de l'Empresa (NOMÉS VISIBLE PER AL PROPIETARI) --- */}
          {role === 'owner' && team && (
              <form action={handleUpdateTeam}>
                  <input type="hidden" name="teamId" value={team.id} />
                  <Card>
                      <CardHeader>
                          <CardTitle>Dades de l'Empresa</CardTitle>
                          <CardDescription>Aquesta informació s'utilitzarà a les teves factures i pressupostos.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                          {/* Dades Bàsiques */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><Label htmlFor="name">Nom de l'empresa</Label><Input id="name" name="name" defaultValue={team.name || ''} className="mt-1" /></div>
                              <div><Label htmlFor="tax_id">NIF/CIF</Label><Input id="tax_id" name="tax_id" defaultValue={team.tax_id || ''} className="mt-1" /></div>
                          </div>
                           {/* Dades de Contacte */}
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div><Label htmlFor="company_email">Email de l'empresa</Label><Input id="company_email" name="company_email" defaultValue={team.email || ''} className="mt-1" /></div>
                              <div><Label htmlFor="company_phone">Telèfon de l'empresa</Label><Input id="company_phone" name="company_phone" defaultValue={team.phone || ''} className="mt-1" /></div>
                          </div>
                           {/* Adreça */}
                          <div><Label htmlFor="address">Adreça Fiscal</Label><Input id="address" name="address" defaultValue={team.address || ''} placeholder="Carrer, Número, Ciutat, CP, País" className="mt-1" /></div>
                          {/* Dades Web i Descriptives */}
                          <div><Label htmlFor="website">Pàgina web</Label><Input id="website" name="website" defaultValue={team.website || ''} placeholder="https://elteudomini.com" className="mt-1" /></div>
                          <div><Label htmlFor="summary">Descripció curta</Label><Textarea id="summary" name="summary" defaultValue={team.summary || ''} placeholder="Una breu descripció del que fa la teva empresa." className="mt-1" /></div>
                          <div><Label htmlFor="sector">Sector</Label><Input id="sector" name="sector" defaultValue={team.sector || ''} placeholder="Ex: Tecnologia, Construcció, etc." className="mt-1" /></div>
                          {/* Logo */}
                          <div>
                              <Label>Logo</Label>
                              <div className="mt-1 flex items-center gap-4">
                                  {logoUrl ? <Image src={logoUrl} alt="Logo" width={64} height={64} className="object-contain rounded-lg" /> : <div className="h-16 w-16 bg-muted rounded-lg" />}
                                  <Button asChild variant="outline">
                                      <label htmlFor="logo-upload" className="cursor-pointer">
                                          {isUploading ? <Loader2 className="animate-spin" /> : <Upload className="w-4 h-4 mr-2" />} Cambiar Logo
                                      </label>
                                  </Button>
                                  <input id="logo-upload" type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={isUploading} />
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