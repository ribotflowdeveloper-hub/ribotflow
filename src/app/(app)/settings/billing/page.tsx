import { BillingClient } from './_components/BillingClient';
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

// Aquest és un Server Component.
// La seva feina és obtenir les dades necessàries del servidor.
export default async function BillingPage() {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // En un futur, aquí faries una crida per obtenir l'estat de la subscripció.
  // const { data: subscription } = await supabase
  //   .from('subscriptions')
  //   .select('plan_name, status')
  //   .eq('user_id', user.id)
  //   .single();

  // De moment, utilitzem dades d'exemple.
  const currentPlan = "Pla Pro";

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Facturació i Subscripció</h1>
      {/* Passem les dades obtingudes al component client */}
      <BillingClient currentPlan={currentPlan} />
    </div>
  );
}
