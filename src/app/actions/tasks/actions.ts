// src/app/actions/tasks/actions.ts (COMPLET I CORREGIT)

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Json, Tables } from "@/types/supabase";
import { JSONContent } from "@tiptap/react";
import { getValidGoogleCalendarToken } from "@/lib/google/google-api"; // ✅ NOU: Importem el gestor de tokens
import type { ActionResult } from "@/types/shared";
// ✅ 1. Importem ELS GUARDIANS
import {
  PERMISSIONS,
  validateActionAndUsage,
  validateSessionAndPermission,
} from "@/lib/permissions/permissions";

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
  // ✅ 2. VALIDACIÓ 3-EN-1 (Sessió + Rol + Límit)
  const validation = await validateActionAndUsage(
    PERMISSIONS.MANAGE_TASKS, // Comprovem el Rol
    "maxTasks", // Comprovem el Límit
  );

  if ("error" in validation) {
    return { error: { form: validation.error.message } };
  }
  const { supabase, activeTeamId, user } = validation;
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

  // ✅ 3. VALIDACIÓ 2-EN-1 (Sessió + Rol)
  // Per actualitzar, no cal comprovar el límit, només el permís.
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TASKS,
  );
  if ("error" in validation) {
    return { error: { form: validation.error.message } };
  }
  const { supabase } = validation;

  const taskId = Number(formData.get("taskId"));
  if (!taskId || isNaN(taskId)) {
    return { error: { form: "ID de la tasca no trobat o invàlid." } };
  }

  // ✅ PAS 1: Obtenim la tasca actual completa per preservar camps importants
  const { data: currentTask, error: fetchError } = await supabase
    .from("tasks")
    .select("*") // Demanem TOTES les dades per no perdre res
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
  // ✅ 4. VALIDACIÓ 2-EN-1 (Sessió + Rol)
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TASKS,
  );
  if ("error" in validation) {
    return { error: { db: validation.error.message } };
  }
  const { supabase } = validation;

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
  // ✅ 5. VALIDACIÓ 2-EN-1 (Sessió + Rol)
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TASKS,
  );
  if ("error" in validation) {
    return { error: { db: validation.error.message } };
  }
  const { supabase } = validation;

  const taskId = typeof taskIdOrObject === "number"
    ? taskIdOrObject
    : taskIdOrObject.id;

  if (!taskId || typeof taskId !== "number") {
    const errorMessage =
      "ID de tasca invàlid o no proporcionat a updateSimpleTask.";
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
  // ✅ 6. VALIDACIÓ 2-EN-1 (Sessió + Rol)
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TASKS,
  );
  if ("error" in validation) {
    return { error: { db: validation.error.message } };
  }
  const { supabase } = validation;

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

/**
 * Server Action per pujar una imatge associada a una tasca des de l'editor.
 */
type UploadSuccessData = {
  signedUrl: string;
  filePath: string;
};

// A 'src/app/actions/tasks/actions.ts'
// (Assegura't que 'validateUserSession' estigui importat al principi del fitxer)
// import { validateUserSession } from '@/lib/supabase/session';

export async function uploadTaskImageAction(
  formData: FormData,
): Promise<ActionResult<UploadSuccessData>> {
  // ✅ 7. VALIDACIÓ 2-EN-1 (Sessió + Rol)
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TASKS,
  );
  if ("error" in validation) {
    console.error(
      "[uploadTaskImageAction] Error validant sessió:",
      validation.error.message,
    );
    return { success: false, message: validation.error.message };
  }
  const { supabase, activeTeamId, user } = validation;

  console.log("[uploadTaskImageAction] Sessió validada per:", user.id);
  console.log("[uploadTaskImageAction] Equip actiu:", activeTeamId);

  // --- Lògica de Fitxer (Aquesta no canvia) ---
  console.log("[uploadTaskImageAction] Validant fitxer...");
  const file = formData.get("file") as File | null;
  if (!file) return { success: false, message: "No s'ha rebut cap fitxer." };
  if (file.size > 5 * 1024 * 1024) {
    return { success: false, message: "Fitxer massa gran (màx 5MB)." };
  }
  if (!file.type.startsWith("image/")) {
    return { success: false, message: "Format no permès (només imatges)." };
  }
  console.log("[uploadTaskImageAction] Fitxer vàlid:", file.name);

  const fileExt = file.name.split(".").pop() || "tmp";
  const uniqueFileName = `${user.id}-${Date.now()}-${
    Math.random().toString(36).substring(2, 8)
  }.${fileExt}`;
  const filePath = `task-uploads/${activeTeamId}/${uniqueFileName}`;
  console.log("[uploadTaskImageAction] Path destí:", filePath);

  // --- Lògica de Pujada i URL Signada (Ara fem servir el client 'supabase' validat) ---
  try {
    console.log(`[uploadTaskImageAction] Iniciant pujada...`);
    // Fem servir el client 'supabase' obtingut de 'validateUserSession'
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("fitxers-privats") // Bucket privat
      .upload(filePath, file);

    if (uploadError) throw new Error(`Error en pujar: ${uploadError.message}`);
    console.log("[uploadTaskImageAction] Pujada OK:", uploadData.path);

    console.log("[uploadTaskImageAction] Generant URL signada...");
    const { data: signedUrlData, error: signedUrlError } = await supabase
      .storage
      .from("fitxers-privats")
      .createSignedUrl(filePath, 60 * 5); // 5 minuts validesa

    if (signedUrlError) {
      throw new Error(`Error generant URL: ${signedUrlError.message}`);
    }
    console.log("[uploadTaskImageAction] URL signada OK.");

    return {
      success: true,
      data: {
        signedUrl: signedUrlData.signedUrl,
        filePath: filePath,
      },
    };
  } catch (error: unknown) {
    const message = error instanceof Error
      ? error.message
      : "Error desconegut processant imatge.";
    console.error("[uploadTaskImageAction] Error:", message, error);
    return { success: false, message: message };
  }
}
/**
 * Server Action per obtenir una URL signada i segura per a un fitxer privat.
 * Aquesta acció s'ha de cridar CADA COP que el client necessiti
 * visualitzar la imatge (p.ex., des del component PrivateImage).
 * @param filePath El path complet del fitxer (p.ex., "task-uploads/team-123/file.jpg")
 * @returns Un objecte ActionResult amb la URL signada o un error.
 */
// A 'src/app/actions/tasks/actions.ts'

export async function getSignedUrlForFile(
  filePath: string,
): Promise<ActionResult<string>> {
  // ✅ 8. VALIDACIÓ (PER LLEGIR)
  // Per veure una imatge, n'hi ha prou amb tenir permís per VEURE tasques.
  const validation = await validateSessionAndPermission(PERMISSIONS.VIEW_TASKS);
  if ("error" in validation) {
    console.warn("[getSignedUrlForFile] Usuari no autenticat.");
    return { success: false, message: "Sessió invàlida." };
  }
  const { supabase } = validation;

  if (!filePath || typeof filePath !== "string" || filePath.trim() === "") {
    return {
      success: false,
      message: "No s'ha proporcionat cap 'filePath' o és invàlid.",
    };
  }

  // 3. Generar la URL signada
  const expiresIn = 60 * 60; // 1 hora

  console.log(`[getSignedUrlForFile] Generant URL per a: ${filePath}`);
  // Fem servir el client 'supabase' obtingut de 'validateUserSession'
  const { data, error } = await supabase.storage
    .from("fitxers-privats") // El teu bucket privat
    .createSignedUrl(filePath, expiresIn);

  if (error) {
    console.error(
      `[getSignedUrlForFile] Error generant URL per a ${filePath}:`,
      error,
    );
    return {
      success: false,
      message: `No s'ha pogut obtenir la URL: ${error.message}`,
    };
  }

  // 4. Retornar èxit
  return { success: true, data: data.signedUrl };
}

type SyncResult = {
  synced: boolean;
  googleCalendarId: string | null;
  message: string;
};

/**
 * Sincronitza UNA tasca (crea o actualitza) amb Google Calendar.
 */
async function syncTaskWithGoogle(
  task: Tables<"tasks">,
  accessToken: string,
): Promise<SyncResult> {
  // 1. Definir l'inici i el final de l'esdeveniment
  // Suposem que 'due_date' és l'hora de FINALITZACIÓ
  const endDate = new Date(task.due_date as string);

  // Mirem si tenim durada. Si no, per defecte és 1 hora.
  const durationInMinutes = typeof task.duration === "number"
    ? task.duration
    : 60;

  // Calculem l'inici restant-li la durada al final
  const startDate = new Date(endDate.getTime() - durationInMinutes * 60 * 1000);

  // 2. Construir el cos de l'esdeveniment
  const eventBody = {
    summary: task.title,
    description: task.description || "Tasca de Ribotflow",
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "UTC", // O la timezone de l'usuari
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "UTC",
    },
    // Podem afegir un enllaç de tornada a l'app (opcional)
    // source: {
    //   title: "Obrir a Ribotflow",
    //   url: `https://ribotflow.com/tasks/${task.id}`
    // }
  };

  let url: string;
  let method: string;

  // 3. Decidir si CREEM (POST) o ACTUALITZEM (PATCH)
  if (task.google_calendar_id) {
    // Ja existeix, fem un UPDATE (PATCH)
    console.log(`Actualitzant tasca ${task.id} a Google Calendar...`);
    url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.google_calendar_id}`;
    method = "PATCH";
  } else {
    // És nova, fem un CREATE (POST)
    console.log(`Creant tasca ${task.id} a Google Calendar...`);
    url = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
    method = "POST";
  }

  // 4. Cridar a l'API de Google
  const response = await fetch(url, {
    method: method,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error(
      `Error de Google API [${method}] per a la tasca ${task.id}:`,
      errorBody,
    );

    // Cas especial: Si intentem actualitzar un event que no existeix (404)
    if (response.status === 404 && task.google_calendar_id) {
      console.log(
        "L'esdeveniment no existia a Google. Forçant nova creació...",
      );
      // Netegem l'ID vell i intentem crear-lo de nou (només 1 cop)
      const newTask = { ...task, google_calendar_id: null };
      return syncTaskWithGoogle(newTask, accessToken);
    }

    return {
      synced: false,
      googleCalendarId: task.google_calendar_id, // Retornem l'ID antic
      message: errorBody.error.message || "Error desconegut de Google API",
    };
  }

  // 5. Èxit! Obtenim l'ID de Google i el retornem
  const googleEvent = await response.json();
  return {
    synced: true,
    googleCalendarId: googleEvent.id, // Aquest és el nou ID
    message: "Sincronitzat correctament.",
  };
}

/**
 * Acció pública per ser cridada des del botó del client.
 * Sincronitza una tasca específica amb Google Calendar.
 */
export async function syncTaskToGoogleAction(
  taskId: number,
): Promise<ActionResult> {
  // ✅ 9. VALIDACIÓ 2-EN-1 (Sessió + Rol)
  const validation = await validateSessionAndPermission(
    PERMISSIONS.MANAGE_TASKS,
  );
  if ("error" in validation) {
    return { success: false, message: validation.error.message };
  }
  const { user, supabase } = validation;

  try {
    // 1. Obtenim la tasca completa
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) throw new Error(`No s'ha trobat la tasca amb ID ${taskId}`);

    // 2. Obtenim un token vàlid (la nostra funció màgica)
    // Passem l'ID de l'usuari que està fent l'acció
    const accessToken = await getValidGoogleCalendarToken(user.id);

    // 3. Cridem a la lògica de sincronització
    const syncResult = await syncTaskWithGoogle(task, accessToken);

    if (!syncResult.synced) {
      throw new Error(syncResult.message);
    }

    // 4. Si ha anat bé, actualitzem la nostra BD amb el nou google_calendar_id
    if (syncResult.googleCalendarId !== task.google_calendar_id) {
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ google_calendar_id: syncResult.googleCalendarId })
        .eq("id", task.id);

      if (updateError) {
        // No és un error fatal, però l'hem de registrar
        console.error(
          `Error en desar el google_calendar_id per a la tasca ${task.id}:`,
          updateError,
        );
      }
    }

    revalidatePath("/[locale]/(app)/crm/calendari", "layout");
    return {
      success: true,
      message: "Tasca sincronitzada amb Google Calendar!",
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    console.error("[syncTaskToGoogleAction] Error:", message, error);
    return { success: false, message: message };
  }
}
