import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './OnboardingClient';

/**
 * @summary Carrega les dades inicials necessàries per a l'onboarding.
 */
export async function OnboardingData() {
  const cookieStore = cookies();
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  const initialFullName = user.user_metadata?.full_name || '';

  return <OnboardingClient initialFullName={initialFullName} />;
}