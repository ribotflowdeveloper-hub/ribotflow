// src/app/actions/tasks/actions.ts (Original + Càlcul Checklist)

"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUserSession } from '@/lib/supabase/session';
import { Tables, Json } from '@/types/supabase'; // Manté Database (usat per Tables) i Json
// ELIMINA AQUESTES DUES LÍNIES:
// import { createServerActionClient } from '@supabase/auth-helpers-nextjs';
// import { cookies } from 'next/headers';
import { JSONContent } from '@tiptap/react';

// Manté el teu FormState original
type FormState = {
  error?: {
    form?: string;
    db?: string;
    title?: string[];
    description?: string[];
    due_date?: string[];
    priority?: string[];
    user_asign_id?: string[];
    contact_id?: string[];
    department_id?: string[];
    duration?: string[];
    // Pots afegir errors específics per als nous camps si vols
    description_json?: string[];
  };
  success?: boolean;
};

// AFEGIT: Tipus per al progrés del checklist
interface ChecklistProgress {
  total: number;
  completed: number;
}

// --- Esquema Zod ---
// Es manté igual, no validarem el JSON aquí per simplicitat
const taskSchema = z.object({
  title: z.string().min(1, "El títol és obligatori."),
  description: z.string().nullable().optional(), // HTML description
  due_date: z.string().datetime(
    "La data de venciment ha de ser una data vàlida.",
  ),
  priority: z.enum(["Baixa", "Mitjana", "Alta"]),
  user_asign_id: z.string().uuid().nullable().optional(),
  contact_id: z.coerce.number().nullable().optional(),
  department_id: z.coerce.number().nullable().optional(),
  duration: z.coerce.number().positive(
    "La duració ha de ser un número positiu.",
  ).optional().nullable(),
  // NO afegim description_json ni checklist_progress aquí, els gestionarem després
});

// --- Funcions Helper ---

// Es manté la teva funció original
const processFormData = (formData: FormData) => {
  let userId = formData.get("user_asign_id");
  if (userId === "none") userId = null;

  let contactId = formData.get("contact_id");
  if (contactId === "none") contactId = null;

  let departmentId = formData.get("department_id");
  if (departmentId === "none") departmentId = null;

  const duration = formData.get("duration");
  const dueDateRaw = formData.get("due_date") as string | null;

  return {
    title: formData.get("title"),
    description: formData.get("description") || null,
    // Gestiona el cas que due_date pugui ser null o invàlid abans de crear Date
    due_date: dueDateRaw ? new Date(dueDateRaw).toISOString() : null, // Important: Pot fallar si dueDateRaw no és vàlid
    priority: formData.get("priority"),
    user_asign_id: userId,
    contact_id: contactId ? parseInt(contactId as string, 10) : null,
    department_id: departmentId ? parseInt(departmentId as string, 10) : null,
    duration: duration ? parseFloat(duration as string) : null,
  };
};

// AFEGIT: Helpers per calcular el progrés del checklist
function findTaskItems(
  node: JSONContent | undefined,
  items: { checked: boolean }[],
) {
  if (!node) return;
  if (node.type === "taskItem") {
    items.push({ checked: node.attrs?.checked === true });
  }
  if (node.content) {
    node.content.forEach((childNode) => findTaskItems(childNode, items));
  }
}

function calculateChecklistProgress(
  jsonContent: JSONContent | null,
): ChecklistProgress {
  const result: ChecklistProgress = { total: 0, completed: 0 };
  if (!jsonContent?.content) {
    return result;
  }
  const taskItems: { checked: boolean }[] = [];
  jsonContent.content.forEach((node) => findTaskItems(node, taskItems));
  result.total = taskItems.length;
  result.completed = taskItems.filter((item) => item.checked).length;
  return result;
}

// --- Server Actions ---

export async function createTask(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  console.log("--- [Server Action] La funció 'createTask' s'ha executat! ---");

  // La validació de sessió es manté igual
  const session = await validateUserSession();
  if ("error" in session) return { error: { form: session.error.message } };
  const { supabase, activeTeamId, user } = session; // Obtenim supabase de la sessió validada

  const parsedData = processFormData(formData);

  // Validació Zod per als camps principals (excloent JSON)
  const validatedFields = taskSchema.safeParse(parsedData);
  if (!validatedFields.success) {
    // Si la data és invàlida des de processFormData, l'error pot no aparèixer aquí correctament.
    // Caldria una validació més robusta de la data.
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  // AFEGIT: Parseig del JSON i càlcul del progrés
  let descriptionJson: JSONContent | null = null;
  let checklistProgress: ChecklistProgress = { total: 0, completed: 0 };
  try {
    const jsonString = formData.get("description_json")?.toString();
    if (jsonString && jsonString !== "null") {
      descriptionJson = JSON.parse(jsonString);
      checklistProgress = calculateChecklistProgress(descriptionJson); // Calcula només si hi ha JSON
    }
  } catch (e) {
    console.error("Error parsing description_json in createTask:", e);
    return {
      error: {
        description_json: [
          "El format del contingut de la descripció és invàlid.",
        ],
      },
    };
  }

  // Prepara les dades per inserir, combinant les validades i les noves
  const dataToInsert: Partial<Tables<"tasks">> = {
    ...validatedFields.data, // Dades validades per Zod
    team_id: activeTeamId,
    user_id: user.id,
    description_json: descriptionJson as Json, // ✅ Cast a Json
    checklist_progress: checklistProgress as unknown as Json, // ✅ Cast a Json
    // La resta de camps per defecte (is_active, is_completed, etc.) els posa la BD o es gestionen aquí si cal
  };

  // Lògica per asigned_date es manté
  if (validatedFields.data.user_asign_id) {
    dataToInsert.asigned_date = new Date().toISOString();
  }

  // Inserció a Supabase
  const { error } = await supabase.from("tasks").insert(dataToInsert); // Simplificat l'insert

  if (error) return { error: { db: error.message } };

  // Revalidació de rutes es manté
  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");
  return { success: true };
}

export async function updateTask(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  console.log("--- [Server Action] La funció 'updateTask' s'ha executat! ---");

  // Validació de sessió es manté
  const session = await validateUserSession();
  if ("error" in session) return { error: { form: session.error.message } };
  const { supabase } = session; // Obtenim supabase

  const taskId = Number(formData.get("taskId"));
  if (!taskId || isNaN(taskId)) {
    return { error: { form: "ID de la tasca no trobat o invàlid." } };
  }

  // Obtenim la tasca actual (igual que abans)
  const { data: currentTask, error: fetchError } = await supabase
    .from("tasks")
    .select("user_asign_id, asigned_date") // Seleccionem també la data actual
    .eq("id", taskId)
    .maybeSingle(); // Usem maybeSingle per gestionar si no es troba

  if (fetchError && fetchError.code !== "PGRST116") { // Ignorem l'error "No rows found"
    return {
      error: {
        db: `No s'ha pogut obtenir la tasca actual: ${fetchError.message}`,
      },
    };
  }
  if (!currentTask && fetchError?.code === "PGRST116") {
    return { error: { form: `La tasca amb ID ${taskId} no existeix.` } };
  }
  // Valor per defecte si és null (poc probable)
  const safeCurrentTask = currentTask ??
    { user_asign_id: null, asigned_date: null };

  const parsedData = processFormData(formData);

  // Validació Zod (igual que abans)
  const validatedFields = taskSchema.safeParse(parsedData);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  // AFEGIT: Parseig del JSON i càlcul del progrés
  let descriptionJson: JSONContent | null = null;
  let checklistProgress: ChecklistProgress = { total: 0, completed: 0 };
  try {
    const jsonString = formData.get("description_json")?.toString();
    if (jsonString && jsonString !== "null") {
      descriptionJson = JSON.parse(jsonString);
      checklistProgress = calculateChecklistProgress(descriptionJson);
    }
  } catch (e) {
    console.error("Error parsing description_json in updateTask:", e);
    return {
      error: {
        description_json: [
          "El format del contingut de la descripció és invàlid.",
        ],
      },
    };
  }

  // Prepara les dades per actualitzar, combinant les validades i les noves
  const dataToUpdate: Partial<Tables<"tasks">> = {
    ...validatedFields.data, // Dades validades
    description_json: descriptionJson as Json, // ✅ Cast a Json
    checklist_progress: checklistProgress as unknown as Json, // ✅ Cast a Json
  };

  // Lògica per actualitzar asigned_date es manté i millora
  const newAssignedId = validatedFields.data.user_asign_id;
  const oldAssignedId = safeCurrentTask.user_asign_id;

  if (newAssignedId) { // Si hi ha un nou usuari assignat (o es manté el mateix)
    if (newAssignedId !== oldAssignedId) { // Si és diferent de l'anterior (inclou el cas de null -> algú)
      dataToUpdate.asigned_date = new Date().toISOString(); // Nova data d'assignació
    } else {
      // Si és el mateix usuari, NO toquem asigned_date (hereta el valor de validatedFields si existeix o es queda com estava)
      // Per assegurar que no es sobreescriu amb null si validatedFields no el té:
      delete dataToUpdate.asigned_date; // Evitem que validatedFields posi null per error
    }
  } else if (oldAssignedId) { // Si no hi ha nou usuari, però n'hi havia un abans (null i abans algú)
    dataToUpdate.asigned_date = null; // Es neteja la data
  } else {
    // Si no hi ha nou usuari i tampoc n'hi havia abans (null i abans null), no fem res amb la data
    delete dataToUpdate.asigned_date;
  }

  // Actualització a Supabase
  const { error } = await supabase
    .from("tasks")
    .update(dataToUpdate)
    .eq("id", taskId);

  if (error) return { error: { db: error.message } };

  // Revalidació de rutes es manté
  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");
  return { success: true };
}

// --- Les altres funcions es mantenen exactament igual ---

export async function deleteTask(taskId: number): Promise<FormState> { // Afegit el tipus de retorn FormState
  const session = await validateUserSession();
  if ("error" in session) return { error: { db: session.error.message } };
  const { supabase } = session;

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) return { error: { db: error.message } };

  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");
  return { success: true };
}

// ✅ NOVA ACCIÓ PER A ACTUALITZACIONS SIMPLES (es manté igual)
// Nota: Aquesta funció NO actualitza checklist_progress automàticament.
// S'hauria de cridar només per camps que no depenen de la descripció, o passar checklist_progress manualment.
export async function updateSimpleTask(
  taskId: number,
  updatedData: Partial<Tables<"tasks">>,
) {
  const session = await validateUserSession();
  // Ajustem el retorn d'error per ser consistent amb FormState si calgués integrar-ho
  if ("error" in session) return { error: { db: session.error.message } };
  const { supabase } = session;

  const { error } = await supabase
    .from("tasks")
    .update(updatedData)
    .eq("id", taskId);

  if (error) {
    console.error("Error updating simple task:", error);
    return { error: { db: error.message } };
  }

  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");
  return { success: true }; // Retorn consistent amb FormState
}

// Es manté igual, però ajustem el retorn d'error
export async function setTaskActiveStatus(taskId: number, newStatus: boolean) {
  console.log(
    `--- [Server Action] Canviant estat de la tasca ${taskId} a ${newStatus} ---`,
  );

  const session = await validateUserSession();
  if ("error" in session) {
    // Retornem un format compatible amb FormState
    return { error: { db: session.error.message } };
  }
  const { supabase } = session;

  const { error } = await supabase.rpc("log_task_activity", {
    task_id_input: taskId,
    new_status_input: newStatus,
  });

  if (error) {
    console.error("Error en RPC 'log_task_activity':", error);
    // Retornem un format compatible amb FormState
    return { error: { db: error.message } };
  }

  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");

  // Retornem un format compatible amb FormState
  return { success: true };
}
