import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server'; 
import { notFound } from "next/navigation";
import { PublicQuoteClient } from "./PublicQuoteClient";
import type { QuoteDataFromServer } from './PublicQuoteClient';

/**
 * Aquest arxiu és un Server Component per a la pàgina PÚBLICA d'un pressupost.
 * Aquesta és la pàgina que un client final visita a través d'un enllaç segur per
 * acceptar o rebutjar el pressupost.
 * La seva principal funció és carregar les dades del pressupost de forma segura
 * basant-se en un ID segur i únic ('secureId').
 */
interface PublicQuotePageProps {
  // En versions recents de Next.js, els 'params' poden arribar com una promesa.
  params: Promise<{ secureId: string }>;
}

export default async function PublicQuotePage(props: PublicQuotePageProps) {
  // Utilitzem un client de Supabase de servidor, ja que no hi ha una sessió d'usuari
  // pròpia de l'aplicació (és una pàgina pública).
  const supabase = createClient(cookies())
;

  // Resolem la promesa per obtenir els paràmetres de la URL.
  const params = await props.params;
  const { secureId } = params;

  // Realitzem la consulta a la base de dades. Demanem el pressupost i totes les seves
  // dades relacionades (contacte, perfil de l'empresa, conceptes).
  const { data: quoteData, error } = await supabase
    .from("quotes")
    .select(`*, contacts (*), profiles (*), quote_items (*)`)
    .eq("secure_id", secureId) // Busquem per l'ID segur, no per l'ID normal.
    .single();

  // Si no trobem el pressupost o hi ha un error, mostrem una pàgina 404.
  if (error || !quoteData) {
    console.error("Error carregant les dades del pressupost:", error?.message || "Dades no trobades");
    notFound();
  }

  // Fem un 'cast' per assegurar que el tipus de dades és correcte.
  const initialData = quoteData as unknown as QuoteDataFromServer;

  // Passem les dades al component de client, que gestionarà la interacció
  // (acceptar o rebutjar el pressupost).
  return <PublicQuoteClient initialQuoteData={initialData} />;
}