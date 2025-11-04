// /app/[locale]/network/actions.ts (FITXER REFACTORITZAT)
"use server";

import { validateUserSession } from "@/lib/supabase/session";
import { revalidatePath } from 'next/cache'; // Importem revalidatePath

// ✅ 1. Importem el NOU servei
import * as networkService from '@/lib/services/network/network.service';
// ✅ 2. Importem el NOU schema de Zod
import { CreateJobPostingSchema } from './schemas';
// ✅ 3. Importem els tipus de DADES (View Models)
import type { PublicProfileDetail, PublicJobPostingDetail } from './types'; 

/**
 * ACCIÓ: Obté les dades detallades d'un sol equip.
 */
export async function getTeamDetailsAction(teamId: string): Promise<{ 
  success: boolean; 
  data?: PublicProfileDetail; 
  message?: string; 
}> {
  if (!teamId) {
    return { success: false, message: "Falta l'ID de l'equip." };
  }
  
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  try {
    const data = await networkService.getTeamDetails(supabase, teamId);
    return { success: true, data: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    console.error("Error a getTeamDetailsAction:", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Obté les dades detallades d'un sol projecte (job_posting).
 */
export async function getJobPostingDetailsAction(jobId: string): Promise<{
  success: boolean;
  data?: PublicJobPostingDetail;
  message?: string;
}> {
  if (!jobId) {
    return { success: false, message: "Falta l'ID del projecte." };
  }

  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: session.error.message };
  }
  const { supabase } = session;

  try {
    const data = await networkService.getJobPostingDetails(supabase, jobId);
    return { success: true, data: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    console.error("Error a getJobPostingDetailsAction:", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Crea un nou projecte (job_posting).
 */
export async function createJobPostingAction(formData: FormData) {
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: "Accés denegat. Has d'iniciar sessió." };
  }
  const { supabase } = session;

  // 1. Validació de dades (es queda a l'acció/controlador)
  const formObject = Object.fromEntries(formData.entries());
  const validatedFields = CreateJobPostingSchema.safeParse({
    ...formObject,
    latitude: formObject.latitude ? parseFloat(formObject.latitude as string) : null,
    longitude: formObject.longitude ? parseFloat(formObject.longitude as string) : null,
    budget: formObject.budget ? parseFloat(formObject.budget as string) : null,
  });

  if (!validatedFields.success) {
    console.warn("Validació de Zod fallida:", validatedFields.error.flatten());
    return { 
      success: false, 
      message: "Dades del formulari invàlides.", 
      errors: validatedFields.error.flatten().fieldErrors 
    };
  }
  
  try {
    // 2. Crida al servei
    const data = await networkService.createJobPosting(supabase, validatedFields.data);

    // 3. Efectes secundaris (Revalidació)
    revalidatePath('/network'); // Revalidem la pàgina del network per veure el nou projecte

    return { success: true, data };

  } catch (error: unknown) {
    // 4. Gestió d'errors
    const message = error instanceof Error ? error.message : "Error desconegut en crear el projecte.";
    console.error("Error a createJobPostingAction:", message);
    return { success: false, message };
  }
}