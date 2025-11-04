// src/app/[locale]/(app)/settings/permissions/_components/PermissionsData.tsx (FITXER NOU)
import { validatePageSession } from '@/lib/supabase/session';
import * as permissionsService from '@/lib/services/settings/permissions/permissions.service';
import { PermissionsClient } from './PermissionsClient';
import type { Role } from '@/lib/permissions/permissions.config';

interface PermissionsDataProps {
  currentUserRole: Role | null;
}

export async function PermissionsData({ currentUserRole }: PermissionsDataProps) {
  
  // 1. Obtenim 'supabase' i 'activeTeamId' per a la consulta
  const { supabase, activeTeamId } = await validatePageSession();

  // 2. Cridem al servei per obtenir les dades
  const { teamMembers, initialPermissions } = await permissionsService.getPermissionsPageData(
    supabase,
    activeTeamId
  );

  // 3. Passem les dades i el rol (que ja teníem) al component client
  return (
    <PermissionsClient
      teamMembers={teamMembers}
      initialPermissions={initialPermissions}
      currentUserRole={currentUserRole} // Passem el rol al client
    />
  );
}