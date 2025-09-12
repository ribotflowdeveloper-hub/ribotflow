import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server'; 
import { notFound } from "next/navigation";
import { PublicQuoteClient } from "./PublicQuoteClient";
import type { QuoteDataFromServer } from './PublicQuoteClient';

// ✅ CORRECCIÓ DEFINITIVA: Definim el tipus correcte per a la nova API asíncrona de Next.js
interface PublicQuotePageProps {
  params: Promise<{ secureId: string }>;
}

export default async function PublicQuotePage(props: PublicQuotePageProps) {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Esperem la promesa per resoldre els paràmetres, com indica la nova versió de Next.js
  const params = await props.params;
  const { secureId } = params;

  // La consulta a la base de dades és correcta
  const { data: quoteData, error } = await supabase
    .from("quotes")
    .select(`
      *,
      contacts (*),
      profiles (*),
      quote_items (*)
    `)
    .eq("secure_id", secureId)
    .single();

  if (error || !quoteData) {
    console.error(
      "Error carregant les dades del pressupost:",
      error?.message || "Dades no trobades"
    );
    notFound();
  }

  // Assegurem que el tipus de dades és el que el component client espera
  const initialData = quoteData as unknown as QuoteDataFromServer;

  return <PublicQuoteClient initialQuoteData={initialData} />;
}

