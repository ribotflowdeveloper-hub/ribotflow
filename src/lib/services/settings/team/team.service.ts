// src/lib/services/team.service.ts
import { type SupabaseClient } from '@supabase/supabase-js';
import { type CompanyProfile } from '@/types/settings/team';
import { type Database } from '@/types/supabase';

/**
 * SERVEI: Obté el perfil de l'empresa (dades de l'emissor).
 * La consulta és la que teníem a 'InvoiceDetailData.tsx'.
 */
export async function getCompanyProfile(
  supabase: SupabaseClient<Database>, 
  teamId: string
): Promise<CompanyProfile | null> {
  
  const { data, error } = await supabase
    .from('teams')
    .select(
      `
      id, 
      company_name: name,
      company_tax_id: tax_id,
      company_address: address,
      company_email: email,
      company_phone: phone,
      logo_url
    `
    )
    .eq('id', teamId)
    .single<CompanyProfile>();
  
  if (error) {
    console.error("Error service(getCompanyProfile):", error.message);
    return null;
  }
  return data;
}
export async function getTeamMembers(
  supabase: SupabaseClient<Database>, 
  teamId: string
) {
  // Retornem la consulta directament; la gestió d'errors es farà al servei orquestrador
  return supabase
    .from('team_members_with_profiles')
    .select('user_id, full_name')
    .eq('team_id', teamId);
}
