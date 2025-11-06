// Ubicació: src/app/[locale]/(app)/comunicacio/transcripcio/_components/TranscripcioData.tsx (FITXER NOU)
import { validateSessionAndPermission, PERMISSIONS } from '@/lib/permissions/permissions'
import { AccessDenied } from '@/components/shared/AccessDenied'
import { getUsageLimitStatus, type UsageCheckResult } from "@/lib/subscription/subscription"
import { getTeamContactsList } from '@/app/[locale]/(app)/crm/contactes/actions'
import { getTeamAudioJobs } from '../actions' // Asumim que es carrega des de les accions
import { AudioJobUploader } from '../new/_components/AudioJobUploader'
import { AudioJobsList } from './AudioJobsList'

// Definim un estat de límit per defecte
const defaultLimit: UsageCheckResult = { allowed: false, current: 0, max: 0, error: "Sessió no vàlida" };

export async function TranscripcioData() {
  
  // 1. Validar permís per VEURE la pàgina
  const validation = await validateSessionAndPermission(PERMISSIONS.VIEW_TRANSLATIONS); // O el permís que toqui
  if ('error' in validation) {
    return <AccessDenied message={validation.error.message} />;
  }
  const { activeTeamId } = validation;

  // 2. Carregar contactes, feines existents i LÍMIT D'IA en paral·lel
  const [
    contacts,
    jobsResult,
    aiActionsLimit
  ] = await Promise.all([
    getTeamContactsList(),
    getTeamAudioJobs(),
    getUsageLimitStatus('maxAIActionsPerMonth') // ✅ AFEGIM LA CÀRREGA DEL LÍMIT
  ]);

  const finalAILimit = aiActionsLimit || defaultLimit;
  const initialJobs = jobsResult.data || [];

  // 3. Renderitzar els components client amb totes les dades
  return (
    <div className="space-y-8">
      <AudioJobUploader 
        contacts={contacts} 
        teamId={activeTeamId}
        aiActionsLimitStatus={finalAILimit} // ✅ PASSEM EL LÍMIT AL COMPONENT
      />
      
      {/* Mostrem la llista de feines existents a sota */}
      <AudioJobsList initialJobs={initialJobs} />
    </div>
  );
}