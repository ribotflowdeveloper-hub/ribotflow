// src/lib/services/comunicacio/email.service.ts
"use server";

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
// ✅ 1. Importem DbTableInsert i Team
import type { Team, DbTableInsert } from '@/types/db'; 
// ✅ 2. Assegura't que la ruta és correcta
import { createOpportunityFromEmail } from '@/lib/services/crm/pipeline/opportunities.service'; 

// --- Servei d'Enviament d'Email ---

interface SendEmailServiceParams {
  supabase: SupabaseClient<Database>;
  contactId: number | null;
  manualEmail: string | null;
  subject: string;
  htmlBody: string;
  userId: string;
  teamId: string;
  // ✅ 3. CANVI: De 'boolean' a 'number | null'
  selectedPipelineId: number | null;
}

/**
 * SERVEI: Envia un email. 
 * Si rep 'manualEmail', busca o crea el contacte.
 * Si rep 'selectedPipelineId', crea una oportunitat.
 */
export async function sendEmail({
  supabase,
  contactId,
  manualEmail,
  subject,
  htmlBody,
  userId,
  teamId,
  // ✅ 4. CANVI
  selectedPipelineId,
}: SendEmailServiceParams): Promise<void> {
  
  let finalContactId: number;
  let contactName: string;

  // LÒGICA PER OBTENIR/CREAR CONTACTE (Això ja estava bé)
  if (contactId) {
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, nom, email')
      .eq('id', contactId)
      .eq('team_id', teamId)
      .maybeSingle();

    if (!contact || !contact.email) {
      throw new Error("El contacte seleccionat no existeix o no té email.");
    }
    finalContactId = contact.id;
    contactName = contact.nom;
  } else if (manualEmail) {
    const email = manualEmail.trim().toLowerCase();
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id, nom, email')
      .eq('email', email)
      .eq('team_id', teamId)
      .maybeSingle();

    if (existingContact) {
      finalContactId = existingContact.id;
      contactName = existingContact.nom;
    } else {
      const newContactData: DbTableInsert<'contacts'> = {
        team_id: teamId,
        email: email,
        nom: email.split('@')[0] || 'Nou Contacte',
        user_id: userId 
      };
      const { data: newContact, error: createError } = await supabase
        .from('contacts')
        .insert(newContactData)
        .select('id, nom, email')
        .single();
      if (createError) {
        console.error("Error creant contacte manualment (service):", createError);
        throw new Error(`No s'ha pogut crear el contacte: ${createError.message}`);
      }
      finalContactId = newContact.id;
      contactName = newContact.nom;
    }
  } else {
    throw new Error("No s'ha proporcionat ni contactId ni manualEmail.");
  }

  // --- ENVIAMENT (Això ja estava bé) ---
  const { error: invokeError } = await supabase.functions.invoke("send-email", {
    body: { contactId: finalContactId, subject, htmlBody },
  });

  if (invokeError) {
    console.error("Error en invocar 'send-email' (service):", invokeError);
    throw new Error(`Error en el servei d'enviament: ${invokeError.message}`);
  }

  // ✅ 5. CANVI: Lògica de negoci de l'Oportunitat
  // Si l'usuari ha seleccionat un pipeline (no és 'null')
  if (selectedPipelineId !== null) {
    await createOpportunityFromEmail({
      supabase,
      contactId: finalContactId,
      teamId,
      userId,
      contactName: contactName,
      // ✅ AFEGIT: Passem l'ID del pipeline al servei d'oportunitats
      pipelineId: selectedPipelineId, 
    });
  }
}

// --- Servei de Network Contact ---
// ... (sense canvis) ...
export interface NetworkContactData {
  contactId: string;
  subject: string;
  body: string;
}
export async function prepareNetworkContact(
    supabase: SupabaseClient<Database>,
    recipientTeamId: string,
    projectId: string,
    activeTeam: Team
): Promise<{ data: NetworkContactData, contactCreated: boolean }> {
  const { data: projectData, error: projectError } = await supabase
    .from('job_postings')
    .select('title')
    .eq('id', projectId)
    .single();
  if (projectError || !projectData) {
    console.error("Error prepareNetworkContact [Project] (service):", projectError);
    throw new Error("No s'ha pogut trobar el projecte.");
  }
  const { title: projectTitle } = projectData;
  const { data: recipientTeamData, error: teamError } = await supabase
    .from('teams')
    .select('name, email, owner_id')
    .eq('id', recipientTeamId)
    .single();
  if (teamError || !recipientTeamData) {
    console.error("Error prepareNetworkContact [Team] (service):", teamError);
    throw new Error("No s'ha pogut trobar l'equip destinatari.");
  }
  let recipientEmail = recipientTeamData.email;
  let recipientName = recipientTeamData.name || 'Contacte de Network';
  if (!recipientEmail) {
    const { data: ownerProfile, error: ownerError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', recipientTeamData.owner_id)
      .single();
    if (ownerError || !ownerProfile || !ownerProfile.email) {
      console.error("Error prepareNetworkContact [Owner Profile] (service):", ownerError);
      throw new Error("L'equip destinatari no té un email de contacte configurat.");
    }
    recipientEmail = ownerProfile.email;
    recipientName = recipientTeamData.name || ownerProfile.full_name || 'Contacte de Network';
  }
  let contactId: number;
  let contactCreated = false;
  const { data: existingContact } = await supabase
    .from('contacts')
    .select('id')
    .eq('team_id', activeTeam.id)
    .eq('email', recipientEmail)
    .maybeSingle();
  if (existingContact) {
    contactId = existingContact.id;
  } else {
    const { data: newContact, error: createError } = await supabase
      .from('contacts')
      .insert({
        team_id: activeTeam.id,
        nom: recipientName,
        email: recipientEmail,
      })
      .select('id')
      .single();
    if (createError || !newContact) {
      console.error("Error prepareNetworkContact [Contact Create] (service):", createError);
      throw new Error("No s'ha pogut crear el nou contacte.");
    }
    contactId = newContact.id;
    contactCreated = true; 
  }
  const initialData: NetworkContactData = {
    contactId: String(contactId),
    subject: `Consulta sobre el projecte: ${projectTitle}`,
    body: `<p>Hola ${recipientName},</p><p><br></p><p>Estic interessat/da en el vostre projecte "<strong>${projectTitle}</strong>" que he vist a la xarxa de Ribotflow.</p><p><br></p><p>Salutacions,</p>`,
  };
  return { data: initialData, contactCreated };
}