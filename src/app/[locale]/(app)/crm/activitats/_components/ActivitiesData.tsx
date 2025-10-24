// ✅ 1. Importem la validació de sessió i el nou servei
import { validatePageSession } from '@/lib/supabase/session';
import { getActivities, type ActivityWithContact } from '@/lib/services/crm/activities/activities.service';

import { ActivitatsClient } from './activitats-client';

// ✅ 2. Re-exportem el tipus per al component client
export type { ActivityWithContact };

export async function ActivitiesData() {
  // ✅ 3. Obtenim sessió i 'activeTeamId'
  const session = await validatePageSession();
  if ('error' in session) {
    console.error(
      "ActivitiesData: Sessió invàlida.",
      typeof session.error === 'object' && session.error !== null && 'message' in session.error
        ? (session.error as { message?: string }).message
        : session.error
    );
    return <ActivitatsClient initialActivities={[]} />;
  }
  
  const { supabase, activeTeamId } = session;
  
  // ✅ 4. Cridem al servei
  const { data: activities, error } = await getActivities(supabase, activeTeamId);

  if (error) {
    console.error("Error en obtenir les activitats (Component):", error.message);
    return <ActivitatsClient initialActivities={[]} />;
  }

  // ✅ 5. Passem les dades al client
  return <ActivitatsClient initialActivities={activities || []} />;
}