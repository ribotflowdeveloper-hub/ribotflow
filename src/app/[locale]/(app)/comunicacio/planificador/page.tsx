import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SocialPlannerClient } from './_components/SocialPlannerClient';
import type { SocialPost } from "@/types/comunicacio/SocialPost";

// Aquest és el component de servidor que s'executa quan l'usuari visita la pàgina.
export default async function SocialPlannerPage() {
  const supabase = createClient(cookies());
  const { data: { user } } = await supabase.auth.getUser();
  
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  
  // Carreguem les publicacions
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('id, content, media_url, media_type, status, scheduled_at, created_at, provider')
    .or(`status.neq.draft,created_at.gte.${thirtyDaysAgo}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error carregant les publicacions:", error);
  }

  // ✅ CORRECCIÓ: Carreguem l'estat real de les connexions de l'usuari.
  const connectionStatuses = {
    linkedin_oidc: false,
    facebook: false,
    instagram: false,
  };

  if (user) {
    const { data: credentials } = await supabase
      .from('user_credentials')
      .select('provider')
      .eq('user_id', user.id);
    
    if (credentials) {
      connectionStatuses.linkedin_oidc = credentials.some(c => c.provider === 'linkedin_oidc');
      connectionStatuses.facebook = credentials.some(c => c.provider === 'facebook');
      connectionStatuses.instagram = credentials.some(c => c.provider === 'instagram');
    }
  }
  
  return (
    <Suspense fallback={<div>Carregant planificador...</div>}>
      <SocialPlannerClient 
        initialPosts={(posts as SocialPost[]) || []} 
        connectionStatuses={connectionStatuses}
      />
    </Suspense>
  );
}

