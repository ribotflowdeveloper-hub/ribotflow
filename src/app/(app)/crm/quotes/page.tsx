import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { QuotesClient } from './_components/QuotesClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pressupostos | Ribot',
};

// Definim un tipus per a les dades dels pressupostos per a més seguretat
export type QuoteWithContact = {
  id: string;
  quote_number: string;
  issue_date: string;
  total: number;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Declined';
  contacts: {
    nom: string;
    empresa: string | null;
  } | null;
  created_at: string;
};

export default async function QuotesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtenim les dades inicials al servidor
  const { data: quotes, error } = await supabase
    .from('quotes')
    .select('*, contacts(nom, empresa)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error en carregar els pressupostos:", error);
    // Podries mostrar una pàgina d'error aquí
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Pressupostos</h1>
        <Link href="/crm/quotes/new" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
          <Plus className="w-4 h-4 mr-2" />
          Nou Pressupost
        </Link>
      </div>
      
      {/* Passem les dades al component client perquè les renderitzi */}
      <QuotesClient initialQuotes={quotes || []} />
    </div>
  );
}
