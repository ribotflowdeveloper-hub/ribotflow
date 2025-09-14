import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import { ProfileForm } from "./_components/ProfileForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'El Teu Perfil | Ribot',
};

// Aquesta pàgina s'executa al servidor per carregar les dades de forma segura.
export default async function ProfilePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // ✅ NOU: Seleccionem tots els camps, inclosos els de facturació de l'empresa.
  const { data: profile } = await supabase
    .from('profiles')
    .select(`
      *, 
      company_tax_id, 
      company_address, 
      company_email, 
      logo_url
    `)
    .eq('id', user.id)
    .single();
  
  // Definim un perfil per defecte per si l'usuari encara no en té.
  const defaultProfile = { 
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
  
  // Passem les dades al component de client que s'encarregarà del formulari interactiu.
  return (
    <ProfileForm 
      profile={profile || defaultProfile} 
      email={user.email || ''} 
    />
  );
}

