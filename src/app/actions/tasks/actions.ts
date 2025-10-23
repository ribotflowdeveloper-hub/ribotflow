// src/app/actions/tasks/actions.ts (COMPLET I CORREGIT)

"use server";

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { validateUserSession } from '@/lib/supabase/session';
import { Tables, Json } from '@/types/supabase';
import { JSONContent } from '@tiptap/react';

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
    description_json?: string[];
  };
  success?: boolean;
};

interface ChecklistProgress {
  total: number;
  completed: number;
}

const taskSchema = z.object({
  title: z.string().min(1, "El títol és obligatori."),
  description: z.string().nullable().optional(),
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
});

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
    due_date: dueDateRaw ? new Date(dueDateRaw).toISOString() : null,
    priority: formData.get("priority"),
    user_asign_id: userId,
    contact_id: contactId ? parseInt(contactId as string, 10) : null,
    department_id: departmentId ? parseInt(departmentId as string, 10) : null,
    duration: duration ? parseFloat(duration as string) : null,
  };
};

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

export async function createTask(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await validateUserSession();
  if ("error" in session) return { error: { form: session.error.message } };
  const { supabase, activeTeamId, user } = session;

  const parsedData = processFormData(formData);

  const validatedFields = taskSchema.safeParse(parsedData);
  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

  let descriptionJson: JSONContent | null = null;
  let checklistProgress: ChecklistProgress = { total: 0, completed: 0 };
  try {
    const jsonString = formData.get("description_json")?.toString();
    if (jsonString && jsonString !== "null") {
      descriptionJson = JSON.parse(jsonString);
      checklistProgress = calculateChecklistProgress(descriptionJson);
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

  const dataToInsert: Partial<Tables<"tasks">> = {
    ...validatedFields.data,
    team_id: activeTeamId,
    user_id: user.id,
    description_json: descriptionJson as Json,
    checklist_progress: checklistProgress as unknown as Json,
  };

  if (validatedFields.data.user_asign_id) {
    dataToInsert.asigned_date = new Date().toISOString();
  }

  const { error } = await supabase.from("tasks").insert(dataToInsert);

  if (error) return { error: { db: error.message } };

  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");
  return { success: true };
}

// ✅ FUNCIÓ CORREGIDA
export async function updateTask(
  prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  console.log("--- [Server Action] La funció 'updateTask' s'ha executat! ---");

  const session = await validateUserSession();
  if ("error" in session) return { error: { form: session.error.message } };
  const { supabase } = session;

  const taskId = Number(formData.get("taskId"));
  if (!taskId || isNaN(taskId)) {
    return { error: { form: "ID de la tasca no trobat o invàlid." } };
  }

  // ✅ PAS 1: Obtenim la tasca actual completa per preservar camps importants
  const { data: currentTask, error: fetchError } = await supabase
    .from("tasks")
    .select('*') // Demanem TOTES les dades per no perdre res
    .eq("id", taskId)
    .single(); // Usem single() per assegurar que existeix

  if (fetchError) {
    return {
      error: {
        db: `No s'ha pogut obtenir la tasca actual: ${fetchError.message}`,
      },
    };
  }

  const parsedData = processFormData(formData);
  const validatedFields = taskSchema.safeParse(parsedData);

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors };
  }

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
  
  // ✅ PAS 2: Construïm l'objecte d'actualització barrejant l'existent amb el nou
  const dataToUpdate: Partial<Tables<"tasks">> = {
    ...currentTask, // Preservem TOTS els camps existents
    ...validatedFields.data, // Sobreescrivim només els camps del formulari
    description_json: descriptionJson as Json,
    checklist_progress: checklistProgress as unknown as Json,
  };

  // Lògica per actualitzar asigned_date (aquesta es manté)
  const newAssignedId = validatedFields.data.user_asign_id;
  const oldAssignedId = currentTask.user_asign_id;

  if (newAssignedId && newAssignedId !== oldAssignedId) {
    dataToUpdate.asigned_date = new Date().toISOString();
  } else if (!newAssignedId && oldAssignedId) {
    dataToUpdate.asigned_date = null;
  }
  
  const { error } = await supabase
    .from("tasks")
    .update(dataToUpdate)
    .eq("id", taskId);

  if (error) return { error: { db: error.message } };

  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");
  return { success: true };
}


export async function deleteTask(taskId: number): Promise<FormState> {
  const session = await validateUserSession();
  if ("error" in session) return { error: { db: session.error.message } };
  const { supabase } = session;

  const { error } = await supabase.from("tasks").delete().eq("id", taskId);

  if (error) return { error: { db: error.message } };

  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");
  return { success: true };
}


export async function updateSimpleTask(
  taskIdOrObject: number | { id: number },
  updatedData: Partial<Tables<"tasks">>,
) {
  const session = await validateUserSession();
  if ("error" in session) return { error: { db: session.error.message } };
  const { supabase } = session;

  const taskId = typeof taskIdOrObject === 'number' ? taskIdOrObject : taskIdOrObject.id;

  if (!taskId || typeof taskId !== 'number') {
    const errorMessage = "ID de tasca invàlid o no proporcionat a updateSimpleTask.";
    console.error(errorMessage, { received: taskIdOrObject });
    return { error: { db: errorMessage } };
  }

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
  return { success: true };
}

export async function setTaskActiveStatus(taskId: number, newStatus: boolean) {
  const session = await validateUserSession();
  if ("error" in session) {
    return { error: { db: session.error.message } };
  }
  const { supabase } = session;

  const { error } = await supabase.rpc("log_task_activity", {
    task_id_input: taskId,
    new_status_input: newStatus,
  });

  if (error) {
    console.error("Error en RPC 'log_task_activity':", error);
    return { error: { db: error.message } };
  }

  revalidatePath("/[locale]/(app)/crm/calendari", "layout");
  revalidatePath("/[locale]/(app)/dashboard", "layout");

  return { success: true };
}