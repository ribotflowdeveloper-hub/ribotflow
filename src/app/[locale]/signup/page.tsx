// /app/[locale]/signup/page.tsx

import SignupForm from './_components/SignupForm';
import { Suspense } from 'react';

/**
 * Aquest és el Server Component per a la pàgina de registre.
 * Llegeix els paràmetres de la URL i els passa al formulari del client.
 */
export default function SignupPage({
  searchParams,
}: {
  searchParams: { 
    invite_token?: string; 
    message?: string;
    email?: string;
  };
}) {
  return (
    // Suspense és una bona pràctica quan un component fill utilitza props que depenen de la URL.
    <Suspense>
      <SignupForm 
        inviteToken={searchParams.invite_token} 
        message={searchParams.message} 
        invitedEmail={searchParams.email}
      />
    </Suspense>
  );
}