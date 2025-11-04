// src/app/[locale]/(app)/settings/permissions/page.tsx (FITXER CORREGIT I NET)
import { Suspense } from 'react';
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TriangleAlert } from "lucide-react";
import { validatePageSession } from '@/lib/supabase/session';
import type { Role } from '@/lib/permissions/permissions.config'; // Assegura't que Role s'exporta

// ✅ 1. Importem els NOUS components
import { PermissionsData } from './_components/PermissionsData';
import { PermissionsSkeleton } from './_components/PermissionsSkeleton';

export default async function PermissionsPage() {
  
  // 1. Validació de sessió i equip
  const { supabase, user, activeTeamId } = await validatePageSession();
  
  // 2. Comprovació de permisos a nivell de pàgina
  const { data: currentUserMember } = await supabase
    .from('team_members')
    .select('role')
    .eq('user_id', user.id)
    .eq('team_id', activeTeamId)
    .single();
  
  const userRole = (currentUserMember?.role as Role) || null;
  const canManagePermissions = userRole === 'owner' || userRole === 'admin';

  // 3. Renderitzat d'accés denegat (si no pot veure la pàgina)
  if (!canManagePermissions) {
    return (
      <Card className="max-w-lg mx-auto mt-10">
        <CardHeader className="text-center">
          <div className="mx-auto bg-destructive/10 p-3 rounded-full w-fit">
            <TriangleAlert className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="mt-4">Accés Denegat</CardTitle>
          <CardDescription>
            Només els propietaris i administradors de l'equip poden gestionar els permisos de la bústia d'entrada.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  // 4. Renderitzat de la pàgina (NET)
  // Passem el rol al component de dades perquè el client no hagi de tornar-lo a buscar
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Permisos de l'Inbox</h1>
        <p className="text-muted-foreground mt-2">
          Selecciona les caselles per a permetre que un membre de l'equip pugui veure la bústia de correu d'un altre.
        </p>
      </div>
      <div className="mt-8">
        <Suspense fallback={<PermissionsSkeleton />}>
          <PermissionsData currentUserRole={userRole} />
        </Suspense>
      </div>
    </div>
  );
}