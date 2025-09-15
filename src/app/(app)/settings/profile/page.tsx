// Aquest arxiu és un Server Component. S'executa al servidor per carregar
// les dades del perfil abans de renderitzar la pàgina.

import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import { ProfileForm } from "./_components/ProfileForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'El Teu Perfil | Ribot',
};

/**
 * Funció principal de la pàgina del servidor per a la ruta '/settings/profile'.
 * S'encarrega de:
 * 1. Autenticar l'usuari.
 * 2. Carregar les dades del seu perfil des de Supabase.
 * 3. Passar les dades al component de client ('ProfileForm') que conté el formulari interactiu.
 */
export default async function ProfilePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verifiquem la sessió de l'usuari. Si no n'hi ha, el redirigim a la pàgina de login.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Realitzem la consulta a la base de dades per obtenir el perfil de l'usuari.
  const { data: profile } = await supabase
    .from('profiles')
    .select(`*, company_tax_id, company_address, company_email, logo_url`)
    .eq('id', user.id)
    .single();
  
  // Definim un objecte 'defaultProfile' amb valors buits.
  // Això serveix com a 'fallback' per si un usuari nou encara no té un registre
  // creat a la taula 'profiles', evitant així errors de 'null' al formulari.
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
  
 
  // Passem les dades obtingudes (o les dades per defecte si no n'hi ha)
  // al component de client 'ProfileForm'.  
  return (
    <ProfileForm 
      profile={profile || defaultProfile} 
      email={user.email || ''} 
    />
  );
}

