import { Suspense } from 'react';
import { SignupClient } from './_components/SignupClient';

interface SignupPageProps {
  searchParams: {
    errorKey?: string;
    message?: string;
    email?: string;
    invite_token?: string;
  };
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  // Les dades es preparen aquí al servidor i es passen al component de client.
  const inviteToken = searchParams.invite_token;
  const invitedEmail = searchParams.email;

  return (
    // Suspense és necessari perquè el nostre hook 'useSignupForm' utilitza 'useSearchParams'.
    <Suspense>
      <SignupClient
        inviteToken={inviteToken}
        invitedEmail={invitedEmail}
      />
    </Suspense>
  );
}
