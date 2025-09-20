import { Suspense } from 'react';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { SocialPlannerClient } from './_components/SocialPlannerClient';
import type { SocialPost } from '@/types/comunicacio/SocialPost';

// Aquest és el component de servidor que s'executa quan l'usuari visita la pàgina.
export default async function SocialPlannerPage() {
  const supabase = createClient(cookies());
  
  // Carreguem totes les publicacions rellevants per al planificador:
  // - Tots els esborranys recents (dels últims 30 dies).
  // - Totes les publicacions que no siguin esborranys (planificades, publicades, fallides).
  const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString();
  
  const { data: posts, error } = await supabase
    .from('social_posts')
    .select('*')
    // Aquesta consulta complexa fa:
    // "dona'm totes les files (OR) que compleixin:
    // 1. el seu estat NO sigui 'draft'
    // 2. O bé, la seva data de creació sigui dels últims 30 dies"
    // Això ens assegura que veiem tot l'historial i només els esborranys recents.
    .or(`status.neq.draft,created_at.gte.${thirtyDaysAgo}`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error carregant les publicacions:", error);
  }

  // Les passem com a propietat al component de client.
  return (
    <Suspense fallback={<div>Carregant planificador...</div>}>
      <SocialPlannerClient initialPosts={(posts as SocialPost[]) || []} />
    </Suspense>
  );
}

