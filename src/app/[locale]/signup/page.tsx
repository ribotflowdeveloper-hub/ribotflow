import { Suspense } from 'react';
import { SignupForm } from './_components/SignupForm';

interface SignupPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function SignupPage(props: SignupPageProps) {
  // ✅ CORRECCIÓ: Fem 'await' per a obtenir els paràmetres de la URL
  const searchParams = await props.searchParams;

  const inviteToken = typeof searchParams.invite_token === 'string' ? searchParams.invite_token : undefined;
  const message = typeof searchParams.message === 'string' ? searchParams.message : undefined;
  const invitedEmail = typeof searchParams.email === 'string' ? searchParams.email : undefined;

  return (
    <Suspense>
      <SignupForm
        inviteToken={inviteToken}
        message={message}
        invitedEmail={invitedEmail}
      />
    </Suspense>
  );
}