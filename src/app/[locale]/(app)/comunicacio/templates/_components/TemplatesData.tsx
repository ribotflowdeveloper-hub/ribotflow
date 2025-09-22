/**
 * @file TemplatesData.tsx
 * @summary Componente de Servidor que carga la lista de plantillas.
 */
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { TemplatesClient } from './templates-client';


export async function TemplatesData() {
  const supabase = createClient(cookies())
;
  
  const { data: templates, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error en carregar les plantilles:', error);
  }

  return <TemplatesClient initialTemplates={templates || []} />;
}