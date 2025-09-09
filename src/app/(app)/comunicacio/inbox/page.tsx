// Ruta del fitxer: src/app/(app)/comunicacio/inbox/page.tsx
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { InboxClient } from './_components/InboxClient';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Safata d\'Entrada | Ribot',
};

// Definim els tipus de dades que mourem entre servidor i client
export type Contact = {
    id: string;
    nom: string;
    email: string | null;
    empresa: string | null;
    telefon: string | null;
    ubicacio: string | null;
};

export type Ticket = {
    id: number;
    user_id: string;
    contact_id: string | null;
    sender_name: string;
    sender_email: string;
    subject: string;
    body: string;
    preview: string;
    sent_at: string;
    status: 'Obert' | 'Llegit' | 'Respost';
    type: 'rebut' | 'enviat';
    contacts: Contact | null;
};

export type Template = {
    id: number;
    name: string;
    subject: string;
    body: string;
    variables: string[] | null;
};

export default async function InboxPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Obtenim les dades inicials en paral·lel
  const [ticketsRes, templatesRes] = await Promise.all([
    supabase.from('tickets').select('*, contacts(*)').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(1000),
    supabase.from('email_templates').select('*').eq('user_id', user.id)
  ]);

  const tickets = (ticketsRes.data as Ticket[]) || [];
  const templates = (templatesRes.data as Template[]) || [];

  return (
    <InboxClient 
        initialTickets={tickets}
        initialTemplates={templates}
    />
  );
}

