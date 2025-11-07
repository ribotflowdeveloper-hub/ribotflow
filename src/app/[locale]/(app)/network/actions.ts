// src/app/[locale]/(app)/network/actions.ts
"use server";

import { validateUserSession } from "@/lib/supabase/session"; 
import { revalidatePath } from 'next/cache'; 

import * as networkService from '@/lib/services/network/network.service';
import { CreateJobPostingSchema } from './schemas';
import type { 
  PublicProfileDetail, 
  PublicJobPostingDetail, 
  MapData 
} from './types'; 

/**
 * ACCIÓ PÚBLICA: Obté Totes les dades (equips i projectes) per al mapa públic.
 */
export async function getNetworkMapDataAction(): Promise<MapData> {
  try {
    const [teams, jobs] = await Promise.all([
      networkService.getAllNetworkTeams(),
      networkService.getAllNetworkJobPostings()
    ]);
    
    return { teams, jobs };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    console.error("Error a getNetworkMapDataAction:", message);
    return { teams: [], jobs: [] };
  }
}

// --- 👇 NOVES ACCIONS PÚBLIQUES ---
// Aquestes accions NO validen sessió i utilitzen el client Admin
// Són per ser cridades des del mapa PÚBLIC (NetworkClient.tsx)

/**
 * ACCIÓ PÚBLICA: Obté les dades públiques d'un equip.
 */
export async function getPublicTeamDetailsAction(teamId: string): Promise<{ 
  success: boolean; 
  data?: PublicProfileDetail | null; 
  message?: string; 
}> {
  if (!teamId) {
    return { success: false, message: "Falta l'ID de l'equip." };
  }
  
  try {
    // ✅ Crida al NOU servei públic (amb admin)
    const data = await networkService.getPublicTeamDetails(teamId);
    if (!data) {
      throw new Error("No s'ha pogut trobar l'equip especificat.");
    }
    return { success: true, data: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    console.error("Error a getPublicTeamDetailsAction:", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ PÚBLICA: Obté les dades públiques d'un projecte.
 */
export async function getPublicJobPostingDetailsAction(jobId: string): Promise<{
  success: boolean;
  data?: PublicJobPostingDetail | null;
  message?: string;
}> {
  if (!jobId) {
    return { success: false, message: "Falta l'ID del projecte." };
  }

  try {
    // ✅ Crida al NOU servei públic (amb admin)
    const data = await networkService.getPublicJobPostingDetails(jobId);
    if (!data) {
      throw new Error("No s'ha pogut trobar el projecte especificat.");
    }
    return { success: true, data: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    console.error("Error a getPublicJobPostingDetailsAction:", message);
    return { success: false, message };
  }
}


// --- ACCIONS PRIVADES EXISTENTS (Sense canvis) ---
// Aquestes accions validen sessió i s'han de fer servir
// en contextos privats (p.ex. settings, dashboard), NO al mapa públic.

/**
 * ACCIÓ PRIVADA: Obté les dades detallades d'un sol equip (per a ús intern).
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
    // ✅ Crida al servei PRIVAT (amb RLS)
    const data = await networkService.getTeamDetails(supabase, teamId);
    return { success: true, data: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    console.error("Error a getTeamDetailsAction:", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ PRIVADA: Obté les dades detallades d'un sol projecte (per a ús intern).
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
    // ✅ Crida al servei PRIVAT (amb RLS)
    const data = await networkService.getJobPostingDetails(supabase, jobId);
    return { success: true, data: data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut.";
    console.error("Error a getJobPostingDetailsAction:", message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ PRIVADA: Crea un nou projecte (job_posting).
 */
export async function createJobPostingAction(formData: FormData) {
  // ... (funció idèntica)
  const session = await validateUserSession();
  if ('error' in session) {
    return { success: false, message: "Accés denegat. Has d'iniciar sessió." };
  }
  const { supabase } = session;
 
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
    const data = await networkService.createJobPosting(supabase, validatedFields.data);
    revalidatePath('/network'); 
    return { success: true, data };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut en crear el projecte.";
    console.error("Error a createJobPostingAction:", message);
    return { success: false, message };
  }
}