// src/app/actions/tasks/actions.ts (COMPLET I CORREGIT - LÒGICA DE SESSIÓ INTERNA)
"use server";

// Importem el client base de @supabase/ssr per crear el client amb cookies
import { createServerClient, type CookieOptions } from '@supabase/ssr';
// Importem 'cookies' de next/headers per accedir a les cookies de la petició
import { cookies } from 'next/headers';
// Importem el nostre tipus de retorn estandarditzat per a accions
import type { ActionResult } from '@/types/shared';
// Importem els tipus de la Base de Dades per a la correcta tipificació
import type { Database } from '@/types/supabase';

/** Tipus específic per a les dades retornades en cas d'èxit en aquesta acció */
type UploadSuccessData = {
    /** URL signada i temporal per visualitzar la imatge pujada. */
    signedUrl: string;
    /** Path complet on s'ha desat el fitxer dins del bucket Supabase Storage. */
    filePath: string;
};

/**
 * Server Action per pujar una imatge associada a una tasca.
 * S'encarrega de:
 * 1. Validar la sessió de l'usuari a partir de les cookies.
 * 2. Validar el fitxer rebut.
 * 3. Construir el path segur al bucket privat (`fitxers-privats/task-uploads/[team_id]/...`).
 * 4. Pujar el fitxer a Supabase Storage.
 * 5. Generar una URL signada de curta durada per a la visualització immediata.
 * 6. Retornar la URL signada i el path del fitxer.
 * @param formData Objecte FormData que ha de contenir una entrada 'file' amb el fitxer a pujar.
 * @returns Un objecte ActionResult indicant èxit o fracàs, amb dades o missatge d'error.
 */
export async function uploadTaskImageAction(formData: FormData): Promise<ActionResult<UploadSuccessData>> {
    const cookieStore = await cookies(); // Obtenim l'accés a les cookies de la petició actual

    // --- INICI: Lògica de Validació de Sessió (Integrada a l'acció) ---
    console.log("[uploadTaskImageAction] Iniciant validació de sessió...");
    // 1. Crear client Supabase específic per a l'acció amb les cookies
    // Utilitzem createServerClient de @supabase/ssr passant-li el cookieStore
    const supabase = createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // Implementació estàndard per llegir/escriure cookies des de Server Components/Actions
                get(name: string) { return cookieStore.get(name)?.value },
                set(name: string, value: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value, ...options }) } catch (error) { console.error("Error setting cookie:", error); }
                },
                remove(name: string, options: CookieOptions) {
                    try { cookieStore.set({ name, value: '', ...options }) } catch (error) { console.error("Error removing cookie:", error); }
                },
            },
        }
    );

    // 2. Obtenir l'usuari autenticat a partir del client creat
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Comprovem si hi ha hagut error o si l'usuari no està autenticat
    if (userError || !user) {
        console.error("[uploadTaskImageAction] Error obtenint usuari o usuari no autenticat:", userError);
        return { success: false, message: "Sessió invàlida o caducada. Si us plau, torna a iniciar sessió." };
    }
    console.log("[uploadTaskImageAction] Usuari autenticat:", user.id);

    // 3. Obtenir l'equip actiu (activeTeamId) amb fallback al perfil
    let activeTeamId = user.app_metadata?.active_team_id as string | null;
    if (!activeTeamId) {
        // Si no està a les metadades del token, el busquem a la taula 'profiles'
        console.warn("[uploadTaskImageAction] active_team_id no trobat a app_metadata. Fent fallback a 'profiles'.");
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('active_team_id')
            .eq('id', user.id)
            .single();

        // Gestionem l'error en obtenir el perfil
        if (profileError) {
             console.error("[uploadTaskImageAction] Error obtenint perfil per fallback d'activeTeamId:", profileError);
             return { success: false, message: "Error intern en verificar l'equip actiu de l'usuari." };
        }
        activeTeamId = profile?.active_team_id ?? null; // Assignem si el trobem, sinó null
    }

    // Comprovació final: és absolutament necessari tenir un equip actiu per continuar
    if (!activeTeamId) {
        console.error("[uploadTaskImageAction] No s'ha pogut determinar l'equip actiu per a l'usuari:", user.id);
        // Podria ser que l'usuari no tingui cap equip assignat o no n'hagi seleccionat cap
        return { success: false, message: "No s'ha pogut determinar l'equip actiu. Assegura't de tenir un equip seleccionat." };
    }
    console.log("[uploadTaskImageAction] Equip actiu determinat:", activeTeamId);
    // --- FI: Lògica de Validació de Sessió ---


    // --- Lògica de Validació i Preparació del Fitxer ---
    console.log("[uploadTaskImageAction] Validant fitxer...");
    const file = formData.get('file') as File | null; // Obtenim el fitxer del FormData

    // Comprovacions bàsiques del fitxer
    if (!file) {
        return { success: false, message: "No s'ha rebut cap fitxer per pujar." };
    }
    // Comprovació de mida (exemple: màxim 5MB)
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, message: "El fitxer supera la mida màxima permesa de 5MB." };
    }
    // Comprovació de tipus (només imatges)
    if (!file.type.startsWith('image/')) {
        return { success: false, message: "El format del fitxer no és vàlid. Només es permeten imatges." };
    }
    console.log("[uploadTaskImageAction] Fitxer vàlid:", file.name, file.size, file.type);

    // Construcció del path on es desarà el fitxer a Supabase Storage
    // Estructura: task-uploads/[TEAM_ID]/[USER_ID]-[TIMESTAMP]-[RANDOM].ext
    // Això compleix la política RLS que espera 'task-uploads' i 'team_id'
    const fileExt = file.name.split('.').pop() || 'tmp'; // Extensió (amb fallback)
    const uniqueFileName = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `task-uploads/${activeTeamId}/${uniqueFileName}`;
    console.log("[uploadTaskImageAction] Path de destí:", filePath);


    // --- Lògica de Pujada a Supabase Storage i Generació d'URL Signada ---
    try {
        console.log(`[Server Action] Iniciant pujada a Supabase Storage...`);
        // Realitzem la pujada al bucket privat 'fitxers-privats'
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('fitxers-privats') // Nom del bucket privat
            .upload(filePath, file, {
                cacheControl: '3600', // Opcional: control de caché
                upsert: false // Opcional: evitar sobrescriure si ja existeix (poc probable amb nom únic)
            });

        // Gestionem errors durant la pujada
        if (uploadError) {
            console.error("[Server Action] Error durant la pujada a Storage:", uploadError);
            // Podria ser un error RLS si la política no és correcta
            throw new Error(`Error en pujar la imatge al servidor: ${uploadError.message}`);
        }
        // La propietat 'path' a uploadData confirma on s'ha desat
        console.log("[Server Action] Pujada completada amb èxit:", uploadData.path);

        // Generem una URL signada per poder visualitzar la imatge des del client
        // Aquesta URL és temporal i segura
        console.log("[Server Action] Generant URL signada...");
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
            .from('fitxers-privats') // Mateix bucket privat
            .createSignedUrl(filePath, 60 * 5); // Validesa de 5 minuts (ajustable)

        // Gestionem errors durant la generació de l'URL signada
        if (signedUrlError) {
            console.error("[Server Action] Error en generar URL signada:", signedUrlError);
            // La imatge s'ha pujat, però no podem obtenir l'URL per mostrar-la
            throw new Error(`La imatge s'ha pujat correctament, però no s'ha pogut generar l'enllaç per visualitzar-la: ${signedUrlError.message}`);
        }

        console.log("[Server Action] URL signada generada amb èxit.");
        // Retornem èxit amb les dades necessàries per al client
        return {
            success: true,
            // message: "Imatge pujada correctament." // Opcional si ActionResult ho permet
            data: {
                signedUrl: signedUrlData.signedUrl, // L'URL per a <img src="...">
                filePath: filePath // El path relatiu per si cal desar-lo a la BD associat a la tasca
            }
        };

    } catch (error: unknown) {
        // Captura qualsevol error ocorregut dins del bloc try (pujada, URL signada, etc.)
        const message = error instanceof Error ? error.message : "Error desconegut durant el processament de la imatge.";
        console.error("[Server Action] Captura d'error general:", message, error); // Log complet de l'error
        return { success: false, message: message }; // Retornem fracàs amb el missatge d'error
    }
}