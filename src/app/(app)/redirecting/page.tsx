// src/app/redirecting/page.tsx
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RedirectAnimation from '@/app/(app)/_components/ui/redirect-animation';

export default function RedirectingPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      // 1. Forcem a Next.js a refrescar les dades del servidor.
      router.refresh(); 

      // 2. Un cop les dades estan actualitzades, naveguem al dashboard.
      router.push('/dashboard');
    }, 3000); // 3 segons d'espera

    // Netejem el temporitzador si el component es desmunta abans de temps
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <RedirectAnimation />
    </div>
  );
}