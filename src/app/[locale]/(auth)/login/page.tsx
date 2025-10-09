// /app/[locale]/login/page.tsx

import LoginForm from './_components/LoginClient';
import { Suspense } from 'react';

// This Server Component is now very simple.
export default function LoginPage() {
  return (
    // Suspense is still needed because the child component uses a hook to read params.
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}