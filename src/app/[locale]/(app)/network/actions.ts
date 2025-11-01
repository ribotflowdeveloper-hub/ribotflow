// /app/[locale]/network/actions.ts

"use server";

import { validateUserSession } from "@/lib/supabase/session";
import { z } from "zod"; // Important per validar les dades d'entrada

/**
 * Obté les dades detallades d'un sol equip, incloent el nom del propietari,
 * utilitzant dues consultes separades per a més robustesa.
 */
export async function getTeamDetailsAction(teamId: string) {
    if (!teamId) {
        return { success: false, message: "Falta l'ID de l'equip." };
    }

    // ✅ 1. Validem la sessió primer. Això ens dona un client de Supabase segur.
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        // PAS 1: Obtenim les dades principals de l'equip des de la taula 'teams'.
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('*') // Obtenim totes les columnes de l'equip
            .eq('id', teamId)
            .single();

        if (teamError || !teamData) {
            throw new Error("No s'ha pogut trobar l'equip especificat.");
        }

        // PAS 2: Si l'equip té un propietari, busquem el seu nom a la taula 'profiles'.
        let ownerData = null;
        if (teamData.owner_id) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', teamData.owner_id)
                .single();

            // Si hi ha un error en trobar el perfil, no fem que tot falli.
            // Simplement, el nom del propietari serà 'null'.
            if (profileError) {
                console.warn(`No s'ha trobat el perfil per a l'owner_id ${teamData.owner_id}:`, profileError.message);
            } else {
                ownerData = { full_name: profileData.full_name };
            }
        }

        // PAS 3: Combinem les dades manualment en l'objecte final.
        const detailedProfile = {
            ...teamData,
            owner: ownerData,
        };

        return { success: true, data: detailedProfile };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en obtenir les dades.";
        console.error("Error a getTeamDetailsAction:", message);
        return { success: false, message };
    }
}


// --- NOVA ADDICIÓ ---

/**
 * Esquema de validació per a la creació d'un nou projecte/oferta.
 * Fem servir Zod per assegurar la integritat de les dades abans d'enviar-les a Supabase.
 */
const CreateJobPostingSchema = z.object({
    team_id: z.string().uuid("ID d'equip invàlid"),
    title: z.string().min(5, "El títol ha de tenir almenys 5 caràcters"),
    description: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    address_text: z.string().optional().nullable(),
    // 'coerce' intenta convertir la dada si no és un array (ex: d'un FormData)
    required_skills: z.preprocess(
        (val) => (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : val),
        z.array(z.string()).optional()
    ),
    budget: z.coerce.number().optional().nullable(),
    expires_at: z.string().optional().nullable(), // Zod gestionarà la conversió de string a timestamp
});

/**
 * Server Action per crear una nova oferta de feina (job_posting).
 * Aquesta funció s'executa al servidor, valida la sessió de l'usuari
 * i les dades del formulari abans d'inserir-les a la BDD.
 */
export async function createJobPostingAction(formData: FormData) {
    "use server";
    
    // 1. Validar la sessió de l'usuari
    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: "Accés denegat. Has d'iniciar sessió." };
    }
    const { supabase } = session;

    // 2. Validar les dades del formulari amb Zod
    // Convertim FormData a un objecte per a Zod
    const formObject = Object.fromEntries(formData.entries());
    
    const validatedFields = CreateJobPostingSchema.safeParse({
        ...formObject,
        // Assegurem que els camps numèrics es tractin correctament
        latitude: formObject.latitude ? parseFloat(formObject.latitude as string) : null,
        longitude: formObject.longitude ? parseFloat(formObject.longitude as string) : null,
        budget: formObject.budget ? parseFloat(formObject.budget as string) : null,
    });

    if (!validatedFields.success) {
        console.warn("Validació de Zod fallida:", validatedFields.error.flatten());
        return { success: false, message: "Dades del formulari invàlides.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    try {
        // 3. Inserir les dades a Supabase
        // La nostra Política RLS (Row Level Security) s'activarà aquí.
        // Comprovarà automàticament si l'usuari (auth.uid()) pertany
        // a l'equip (validatedFields.data.team_id).
        
        const { data, error } = await supabase
            .from('job_postings')
            .insert(validatedFields.data)
            .select()
            .single();

        if (error) {
            console.error("Error d'inserció a Supabase (possiblement RLS):", error.message);
            // Missatge genèric per seguretat
            throw new Error("No s'ha pogut publicar el projecte. Assegura't que tens permisos.");
        }

        // 4. Retornar èxit
        return { success: true, data };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en crear el projecte.";
        console.error("Error a createJobPostingAction:", message);
        return { success: false, message };
    }
}