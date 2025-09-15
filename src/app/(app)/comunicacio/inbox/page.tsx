/**
 * @file page.tsx (Inbox)
 * @summary Aquest fitxer defineix la pàgina principal de la Safata d'Entrada. És un Component de Servidor de Next.js.
 * La seva responsabilitat principal és carregar les dades inicials des del servidor (Supabase) de manera segura
 * i passar-les a un component de client (`InboxClient`) que s'encarregarà de tota la interactivitat.
 * Aquest patró (Server Component que carrega dades i les passa a un Client Component) és fonamental en Next.js App Router.
 */

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { InboxClient } from './_components/InboxClient';
import type { Metadata } from 'next';

// 'force-dynamic' assegura que aquesta pàgina sempre es renderitzi de manera dinàmica en cada petició.
// Això garanteix que les dades (tiquets, etc.) sempre estiguin actualitzades.
export const dynamic = 'force-dynamic';

// Metadades per al SEO i el títol de la pestanya del navegador.
export const metadata: Metadata = {
  title: 'Safata d\'Entrada | Ribot',
};

// --- Definició de Tipus de Dades ---
// Aquests tipus defineixen l'estructura de les dades que s'obtenen de Supabase i es passen
// entre el servidor i el client, assegurant la consistència i prevenint errors.

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
    sent_at: string; // Es manté com a string (ISO 8601) per a la serialització entre servidor i client.
    status: 'Obert' | 'Llegit' | 'Respost';
    type: 'rebut' | 'enviat';
    contacts: Contact | null; // Dades del contacte associat (si existeix).
};

export type Template = {
    id: number;
    name: string;
    subject: string;
    body: string;
    variables: string[] | null;
};

/**
 * @function InboxPage
 * @summary Component de Servidor asíncron que actua com a punt d'entrada per a la ruta /comunicacio/inbox.
 */
export default async function InboxPage() {
  // Obtenim les cookies de la petició per poder crear un client de Supabase segur al servidor.
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Verifiquem l'autenticació de l'usuari. Si no està connectat, el redirigim a la pàgina de login.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // Optimització: Executem les consultes a la base de dades en paral·lel amb Promise.all.
  // Això redueix el temps total d'espera per a la càrrega de dades.
  const [ticketsRes, templatesRes] = await Promise.all([
    // Consulta per obtenir els últims 1000 tiquets de l'usuari, juntament amb les dades del contacte associat.
    supabase.from('tickets').select('*, contacts(*)').eq('user_id', user.id).order('sent_at', { ascending: false }).limit(1000),
    // Consulta per obtenir les plantilles d'email de l'usuari.
    supabase.from('email_templates').select('*').eq('user_id', user.id)
  ]);

  // Fem un "casting" de les dades als nostres tipus definits i gestionem el cas on no hi hagi dades.
  const tickets = (ticketsRes.data as Ticket[]) || [];
  const templates = (templatesRes.data as Template[]) || [];

  // Renderitzem el component de client, passant-li les dades carregades com a propietats inicials.
  // A partir d'aquí, InboxClient s'encarregarà de la lògica d'interfície.
  return (
    <InboxClient 
        initialTickets={tickets}
        initialTemplates={templates}
    />
  );
}
