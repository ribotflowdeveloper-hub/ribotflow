// /app/[locale]/(auth)/signup/page.tsx (VERSIÓ FINAL)

import { Suspense } from 'react';
import { SignupClient } from './_components/SignupClient';

// Ja no necessitem definir 'SignupPageProps' si no hi ha props.
// La pàgina ja no necessita rebre 'searchParams'.
export default async function SignupPage() {
  return (
    <Suspense>
      <SignupClient />
    </Suspense>
  );
}