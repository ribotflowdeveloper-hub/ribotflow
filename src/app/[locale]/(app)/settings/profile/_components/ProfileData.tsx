import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";

/**
 * @summary Server Component asíncron que carrega les dades del perfil de l'usuari.
 */
export async function ProfileData() {
  const supabase = createClient(cookies())
;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
  
  // Definim un objecte 'defaultProfile' per evitar errors si el perfil és nou i no existeix.
  const defaultProfile = { 
    id: user.id,
    full_name: '', 
    company_name: '',
    summary: '',
    company_phone: '',
    services: [],
    street: '',
    city: '',
    postal_code: '',
    region: '',
    country: '',
    is_public_profile: false,
    company_tax_id: '',
    company_address: '',
    company_email: '',
    logo_url: null,
  };
  
  return (
    <ProfileForm 
      profile={profile || defaultProfile} 
      email={user.email || ''} 
    />
  );
}