// src/app/(app)/settings/profile/page.tsx

import { createClient } from "@/lib/supabase/server";
import { cookies } from 'next/headers';
import { redirect } from "next/navigation";
import { ProfileForm } from "./_components/ProfileForm"; // ✅ CANVI: Importem el teu component ProfileForm
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
  
  // Creem un perfil per defecte per si l'usuari és nou i encara no en té
  const defaultProfile = { full_name: '', company_name: '' };
  
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">El Teu Perfil</h1>
      <div className="glass-card p-8">
        {/* ✅ CANVI: Utilitzem el teu component ProfileForm */}
        <ProfileForm 
          profile={profile || defaultProfile} 
          email={user.email || ''} 
        />
      </div>
    </div>
  );
}