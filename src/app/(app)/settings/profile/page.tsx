import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import { ProfileForm } from "./_components/ProfileForm";
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'El Teu Perfil | Ribot',
};

export default async function ProfilePage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, company_name')
    .eq('id', user.id)
    .single();
  
  const defaultProfile = { full_name: '', company_name: '' };
  
  // The Server Page now *only* renders the Client Component, passing it the data.
  return (
    <ProfileForm 
      profile={profile || defaultProfile} 
      email={user.email || ''} 
    />
  );
}