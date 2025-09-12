// src/app/redirecting/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RedirectAnimation from '@/app/(app)/_components/ui/redirect-animation';

export default function RedirectingPage() {
  const router = useRouter();

  useEffect(() => {
    // Després de 3 segons, redirigim l'usuari al dashboard
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 3000); // 3000ms = 3 segons

    // Netejem el temporitzador si el component es desmunta abans de temps
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <RedirectAnimation />
    </div>
  );
}