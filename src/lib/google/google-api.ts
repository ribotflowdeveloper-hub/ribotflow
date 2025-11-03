// src/lib/google-api.ts
"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
// ✅ CORRECCIÓ: Importem les nostres noves funcions híbrides
import { encryptToken, decryptToken } from '@/lib/utils/crypto';
import { validateUserSession } from "@/lib/supabase/session";
import { Task  } from "@/types/db";
import { ActionResult } from "@/types/shared";
import { revalidatePath } from "next/cache";

// ... (Els teus tipus 'EncryptedCredential' i 'GoogleRefreshResponse' es queden igual)
type EncryptedCredential = {
  refresh_token: string | null;
  access_token: string;
  expires_at: string; // ISO string
  provider_user_id: string;
  team_id: string | null;
};
type GoogleRefreshResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: "Bearer";
};


export async function getValidGoogleCalendarToken(userId: string): Promise<string> {
  
  const supabase = createClient(); 
  
  const secretKey = process.env.ENCRYPTION_SECRET_KEY;
  if (!secretKey) {
    throw new Error("La clau d'encriptació no està configurada.");
  }

  // 1. Obtenir la credencial ENCRIPTADA de la BD
  const { data: creds, error } = await supabase
    .from("user_credentials")
    .select("refresh_token, access_token, expires_at, provider_user_id, team_id")
    .eq("user_id", userId)
    .eq("provider", "google_calendar")
    .returns<EncryptedCredential[]>()
    .single();

  if (error || !creds) {
    throw new Error("No s'ha trobat la credencial de Google Calendar. Si us plau, torna a connectar.");
  }

  // 2. DESENCRIPTAR els tokens usant la funció híbrida
  // ✅ CORRECCIÓ: Fem servir 'await decryptToken'
  const access_token = await decryptToken(creds.access_token, secretKey);
  const refresh_token = creds.refresh_token 
    ? await decryptToken(creds.refresh_token, secretKey) 
    : null;
  
  if (!refresh_token) {
    throw new Error("No s'ha trobat un refresh token vàlid (necessari per a l'accés offline).");
  }

  const expires_at = creds.expires_at;
  const expiresAtDate = new Date(expires_at);

  // 3. Comprovar si el token ha caducat (amb un marge de 5 minuts)
  if (expiresAtDate > new Date(Date.now() + 5 * 60 * 1000)) {
    console.log("Token de Google Calendar vàlid. Reutilitzant.");
    return access_token; // El token encara és bo
  }

  // 4. El token ha caducat. L'hem de refrescar.
  console.log("Token de Google Calendar caducat. Refrescant...");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    // ... (la teva crida a fetch es queda igual)
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refresh_token,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json();
    console.error("Error en refrescar el token de Google:", errorBody);
    throw new Error("No s'ha pogut refrescar el token de Google. Si us plau, torna a connectar.");
  }

  const newTokens: GoogleRefreshResponse = await response.json();
  const new_expires_at = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

  // 5. Guardar els nous tokens (encriptats) a la BD
  // ✅ CORRECCIÓ: Encriptem amb el mètode NOU i RÀPID (SubtleCrypto)
  const new_encrypted_access_token = await encryptToken(newTokens.access_token, secretKey);
  
  // El refresh token que guardem és l'original ENCRIPTAT
  // (El 'refresh_token' de Google només es retorna la primera vegada, així que reutilitzem el vell)
  const original_encrypted_refresh_token = creds.refresh_token; 

  const supabaseAdmin = createAdminClient();
  const { error: updateError } = await supabaseAdmin.from("user_credentials").upsert({
      user_id: userId,
      provider: "google_calendar",
      access_token: new_encrypted_access_token, // El nou token ràpid
      refresh_token: original_encrypted_refresh_token, // El refresh token encriptat original
      expires_at: new_expires_at,
      team_id: creds.team_id, 
      provider_user_id: creds.provider_user_id,
  }, { onConflict: 'user_id, provider' });


  if (updateError) {
    console.error(`Error en guardar el token refrescat: ${updateError.message}`);
  }

  // 6. Retornar el nou access token (desencriptat)
  return newTokens.access_token;
}

// ... (La resta del teu codi)
// type SyncResult = ...
// async function syncTaskWithGoogle(...)
// export async function syncTaskToGoogleAction(...)
// ... (Tota la lògica de 'syncTaskWithGoogle' i 'syncTaskToGoogleAction' es queda exactament igual)
type SyncResult = {
  synced: boolean;
  googleCalendarId: string | null;
  message: string;
};

async function syncTaskWithGoogle(
  task: Task,
  accessToken: string,
): Promise<SyncResult> {

  // 1. Definir l'inici i el final de l'esdeveniment
  const endDate = new Date(task.due_date as string);
  const durationInMinutes = typeof task.duration === 'number' ? task.duration : 60;
  const startDate = new Date(endDate.getTime() - durationInMinutes * 60 * 1000);

  // 2. Construir el cos de l'esdeveniment
  const eventBody = {
    summary: task.title,
    description: task.description || "Tasca de Ribotflow",
    start: {
      dateTime: startDate.toISOString(),
      timeZone: "UTC", 
    },
    end: {
      dateTime: endDate.toISOString(),
      timeZone: "UTC",
    },
  };

  let url: string;
  let method: string;

  // 3. Decidir si CREEM (POST) o ACTUALITZEM (PATCH)
  if (task.google_calendar_id) {
    console.log(`Actualitzant tasca ${task.id} a Google Calendar...`);
    url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${task.google_calendar_id}`;
    method = "PATCH";
  } else {
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
    console.error(`Error de Google API [${method}] per a la tasca ${task.id}:`, errorBody);
    
    if (response.status === 404 && task.google_calendar_id) {
      console.log("L'esdeveniment no existia a Google. Forçant nova creació...");
      const newTask = { ...task, google_calendar_id: null };
      return syncTaskWithGoogle(newTask, accessToken);
    }
    
    return {
      synced: false,
      googleCalendarId: task.google_calendar_id, 
      message: errorBody.error.message || "Error desconegut de Google API",
    };
  }

  // 5. Èxit! Obtenim l'ID de Google i el retornem
  const googleEvent = await response.json();
  return {
    synced: true,
    googleCalendarId: googleEvent.id, 
    message: "Sincronitzat correctament.",
  };
}

export async function syncTaskToGoogleAction(
  taskId: number,
): Promise<ActionResult> {
  const session = await validateUserSession();
  if ("error" in session) {
    return { success: false, message: "No autenticat" };
  }
  const { user, supabase } = session;

  try {
    // 1. Obtenim la tasca completa
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError) throw new Error(`No s'ha trobat la tasca amb ID ${taskId}`);

    // 2. Obtenim un token vàlid (la nostra funció màgica)
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
        console.error(`Error en desar el google_calendar_id per a la tasca ${task.id}:`, updateError);
      }
    }

    revalidatePath("/[locale]/(app)/crm/calendari", "layout");
    return { success: true, message: "Tasca sincronitzada amb Google Calendar!" };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconegut";
    console.error("[syncTaskToGoogleAction] Error:", message, error);
    return { success: false, message: message };
  }
}