// Aquest arxiu crea un client de Supabase dissenyat per ser utilitzat de forma segura
// als "Client Components" (arxius amb la directiva "use client").

import { createBrowserClient } from '@supabase/ssr';

/**
 * Funció per crear una instància del client de Supabase per al navegador.
 * Aquesta instància és un "singleton", el que significa que només es crea una vegada
 * i es reutilitza a tota l'aplicació del costat del client.
 */
export function createClient() {
  // 'createBrowserClient' és la funció recomanada de la llibreria '@supabase/ssr'
  // per a la interacció des del navegador.
  return createBrowserClient(
    // Aquestes són variables d'entorn públiques. El prefix 'NEXT_PUBLIC_'
    // les fa accessibles al codi del navegador. MAI s'han de posar claus
    // secretes amb aquest prefix.
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}