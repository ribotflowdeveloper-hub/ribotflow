import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TemplatesClient } from './_components/templates-client';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plantilles d\'Email | Ribot',
};

// Definim el tipus per a les plantilles
export type EmailTemplate = {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  variables: string[];
};

export default async function TemplatesPage() {
  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    redirect('/login');
  }

  const { data: templates, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching templates:', error);
  }

  return <TemplatesClient initialTemplates={templates || []} />;
}