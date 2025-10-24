import { validatePageSession } from "@/lib/supabase/session";
import { CrmClient } from './crm-client';

// ✅ 1. Importem el servei i els tipus principals
import { getCrmDashboardData } from '@/lib/services/crm.service';

// ✅ 2. Re-exportem els tipus que el CrmClient pugui necessitar
export type { 
  CrmData,
  CampaignPerformanceData,
  DailySummaryData,
  KpiData,
  UnreadActivity,
  TopClient,
  ColdContact,
  LeadSource,
  OpportunityAgingData,
  LeadConversionData
} from '@/lib/services/crm.service';

// El tipus ComposeEmailData es manté si es fa servir localment
export type ComposeEmailData = { contactId: number; to: string; subject: string; body: string; };


export async function CrmDataDashboard() {
  // ✅ 3. Validació de sessió
  const session = await validatePageSession();
  if ('error' in session) {
    const errorMessage = typeof session.error === 'object' && session.error && 'message' in session.error
      ? (session.error as { message?: string }).message
      : String(session.error);
    console.error("CrmData: Sessió invàlida.", errorMessage);
    return <CrmClient initialData={null} />;
  }
  const { supabase, activeTeamId } = session;

  // ✅ 4. UNA SOLA CRIDA. Tota la complexitat està encapsulada.
  const { data, error } = await getCrmDashboardData(supabase, activeTeamId);

  if (error || !data) {
    console.error("Error en carregar CrmData (Component):", error);
    return <CrmClient initialData={null} />;
  }
  
  // ✅ 5. Passem les dades processades al client
  return <CrmClient initialData={data} />;
}