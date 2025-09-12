import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import { PublicQuoteClient } from "./PublicQuoteClient";

type PublicQuotePageProps = {
  params: { secureId: string };
};

export default async function PublicQuotePage({
  params,
}: PublicQuotePageProps) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { secureId } = params;

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

  if (error) {
    console.error("Error carregant les dades del pressupost:", error.message);
    notFound();
  }

  if (!quoteData) {
    notFound();
  }

  return <PublicQuoteClient initialQuoteData={quoteData} />;
}
