/**
 * @file page.tsx (Redirecting)
 * @summary Aquest fitxer defineix una pàgina de transició que es mostra a l'usuari
 * després d'accions importants com completar el formulari d'onboarding.
 * La seva funció és assegurar que la sessió del client i del servidor estigui sincronitzada
 * abans de redirigir a l'usuari al seu destí final (normalment el Dashboard).
 */

"use client"; // És un component de client perquè necessita utilitzar hooks (useEffect, useRouter).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import RedirectAnimation from '@/app/(app)/_components/ui/redirect-animation';

/**
 * @function RedirectingPage
 * @summary Mostra una animació i gestiona la redirecció.
 */
export default function RedirectingPage() {
  const router = useRouter();

  // Aquest efecte s'executa un sol cop quan el component es munta.
  useEffect(() => {
    // Creem un temporitzador per donar temps a l'animació i assegurar que tot es processi correctament.
    const timer = setTimeout(() => {
      // --- AQUESTA LÒGICA ÉS CRUCIAL ---
      // 1. router.refresh(): Aquesta funció de Next.js força una recàrrega de les dades del servidor
      // sense perdre l'estat del client. És vital per assegurar que el servidor reconeix la nova
      // sessió o l'estat de l'usuari (ex: onboarding completat) abans de la navegació.
      router.refresh(); 

      // 2. router.push('/dashboard'): Un cop la sessió del servidor està actualitzada,
      // naveguem de manera segura a la pàgina principal de l'aplicació.
      router.push('/dashboard');
    }, 3000); // Esperem 3 segons.

    // Funció de neteja: si l'usuari navega fora d'aquesta pàgina abans que passin els 3 segons,
    // el temporitzador es cancel·la per evitar errors.
    return () => clearTimeout(timer);
  }, [router]);

  return (
    // Mostrem una animació per millorar l'experiència de l'usuari durant l'espera.
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <RedirectAnimation />
    </div>
  );
}
