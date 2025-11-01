// /app/[locale]/network/actions.ts

"use server";

import { validateUserSession } from "@/lib/supabase/session";
import { z } from "zod";
// ✅ 1. Importem el nou tipus de dades (assegura't que la ruta és correcta)
import type { PublicJobPostingDetail } from './types'; 

/**
 * Obté les dades detallades d'un sol equip (perfil professional).
 */
export async function getTeamDetailsAction(teamId: string) {
    if (!teamId) {
        return { success: false, message: "Falta l'ID de l'equip." };
    }

    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        const { data: teamData, error: teamError } = await supabase
            .from('teams')
            .select('*')
            .eq('id', teamId)
            .single();

        if (teamError || !teamData) {
            throw new Error("No s'ha pogut trobar l'equip especificat.");
        }

        let ownerData = null;
        if (teamData.owner_id) {
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', teamData.owner_id)
                .single();

            if (profileError) {
                console.warn(`No s'ha trobat el perfil per a l'owner_id ${teamData.owner_id}:`, profileError.message);
            } else {
                ownerData = { full_name: profileData.full_name };
            }
        }

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

/**
 * ✅ 2. NOVA ACCIÓ: Obté les dades detallades d'un sol projecte (job_posting).
 */
export async function getJobPostingDetailsAction(jobId: string) {
    if (!jobId) {
        return { success: false, message: "Falta l'ID del projecte." };
    }

    const session = await validateUserSession();
    if ('error' in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase } = session;

    try {
        // Seleccionem les dades del projecte i fem un join amb 'teams' per les dades del publicador
        const { data: jobData, error: jobError } = await supabase
            .from('job_postings')
            .select(`
                *,
                teams (
                    name,
                    logo_url
                )
            `)
            .eq('id', jobId)
            .single();

        if (jobError || !jobData) {
            console.error("Error getJobPostingDetailsAction:", jobError);
            throw new Error("No s'ha pogut trobar el projecte especificat.");
        }

        // El tipus s'ha d'ajustar al que retorna la consulta
        return { success: true, data: jobData as PublicJobPostingDetail };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en obtenir les dades del projecte.";
        console.error("Error a getJobPostingDetailsAction:", message);
        return { success: false, message };
    }
}


// --- ACCIÓ DE CREAR PROJECTE (existent, sense canvis) ---

const CreateJobPostingSchema = z.object({
    team_id: z.string().uuid("ID d'equip invàlid"),
    title: z.string().min(5, "El títol ha de tenir almenys 5 caràcters"),
    description: z.string().optional().nullable(),
    latitude: z.number().optional().nullable(),
    longitude: z.number().optional().nullable(),
    address_text: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    region: z.string().optional().nullable(),
    postcode: z.string().optional().nullable(),
    country: z.string().optional().nullable(),
    required_skills: z.preprocess(
        (val) => (typeof val === 'string' ? val.split(',').map(s => s.trim()).filter(Boolean) : val),
        z.array(z.string()).optional()
    ),
    budget: z.coerce.number().optional().nullable(),
    expires_at: z.string().optional().nullable(),
});

export async function createJobPostingAction(formData: FormData) {
    "use server";
    
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
        return { success: false, message: "Dades del formulari invàlides.", errors: validatedFields.error.flatten().fieldErrors };
    }
    
    try {
        const { data, error } = await supabase
            .from('job_postings')
            .insert(validatedFields.data)
            .select()
            .single();

        if (error) {
            console.error("Error d'inserció a Supabase (possiblement RLS):", error.message);
            throw new Error("No s'ha pogut publicar el projecte. Assegura't que tens permisos.");
        }

        return { success: true, data };

    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "Error desconegut en crear el projecte.";
        console.error("Error a createJobPostingAction:", message);
        return { success: false, message };
    }
}