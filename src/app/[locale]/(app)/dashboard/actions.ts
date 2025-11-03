'use server';

import { revalidatePath } from "next/cache";
import { validateUserSession } from "@/lib/supabase/session";
import { NewTaskPayload } from "@/types/dashboard/types"; 
import type { Tables } from "@/types/supabase";
import type { Department } from "@/types/db"; // Importem el tipus correcte

// ✅ 1. Importem el nostre servei
import * as dashboardService from "@/lib/services/dashboard/dashboard.service";
import { type ActionResult } from "@/types/shared/index"; // Resultat genèric


/**
 * ACCIÓ: Afegeix una nova tasca.
 */
export async function addTask(taskData: NewTaskPayload): Promise<ActionResult> {
  // 1. Validar Sessió
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, user, activeTeamId } = session;

  try {
    // 2. Cridar al Servei
    await dashboardService.addTask(supabase, taskData, user.id, activeTeamId);
    
    // 3. Efecte secundari
    revalidatePath('/dashboard');
    return { success: true };

  } catch (error: unknown) {
    // 4. Gestió d'errors
    const message = (error as Error).message;
    console.error('Error creating task (action):', message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Elimina una tasca.
 */
export async function deleteTask(taskId: number): Promise<ActionResult> {
  // 1. Validar Sessió
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase } = session;

  try {
    // 2. Cridar al Servei
    await dashboardService.deleteTask(supabase, taskId);
    
    // 3. Efecte secundari
    revalidatePath('/dashboard');
    return { success: true };

  } catch (error: unknown) {
    // 4. Gestió d'errors
    const message = (error as Error).message;
    console.error('Error en eliminar la tasca (action):', message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Afegeix un nou departament.
 */
export async function addDepartment(name: string): Promise<ActionResult<Department>> {
  // 1. Validar Sessió
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase, activeTeamId } = session;

  try {
    // 2. Cridar al Servei
    const data = await dashboardService.addDepartment(supabase, name, activeTeamId);

    // 3. Efecte secundari
    revalidatePath('/dashboard');
    return { success: true, data };

  } catch (error: unknown) {
    // 4. Gestió d'errors (incloent duplicats)
    const message = (error as Error).message;
    console.error('Error en crear el departament (action):', message);
    return { success: false, message };
  }
}

/**
 * ACCIÓ: Actualitza una tasca.
 */
export async function updateTaskAction(taskId: number, updatedData: Partial<Tables<'tasks'>>): Promise<ActionResult> {
  // 1. Validar Sessió
  const session = await validateUserSession();
  if ('error' in session) return { success: false, message: session.error.message };
  const { supabase } = session;

  try {
    // 2. Cridar al Servei
    await dashboardService.updateTask(supabase, taskId, updatedData);

    // 3. Efecte secundari
    revalidatePath('/dashboard');
    return { success: true };

  } catch (error: unknown) {
    // 4. Gestió d'errors
    const message = (error as Error).message;
    console.error('Error en actualitzar la tasca (action):', message);
    return { success: false, message };
  }
}