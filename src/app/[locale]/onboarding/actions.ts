"use server";

import { z } from 'zod';
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

// L'esquema de Zod i el tipus es queden igual
const OnboardingSchema = z.object({
    full_name: z.string().min(3, "El nom complet és obligatori."),
    company_name: z.string().min(2, "El nom de l'empresa és obligatori."),
    tax_id: z.string().optional(),
    website: z.string().url("Introdueix una URL vàlida.").optional().or(z.literal('')),
    summary: z.string().optional(),
    sector: z.string().optional(),
    services: z.array(z.string()).min(1, "Has de seleccionar almenys un servei."),
    phone: z.string().optional(),
    street: z.string().min(1, "El carrer és obligatori."),
    city: z.string().min(1, "La ciutat és obligatòria."),
    postal_code: z.string().min(1, "El codi postal és obligatori."),
    region: z.string().min(1, "La regió és obligatòria."),
    country: z.string().min(1, "El país és obligatori."),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
});

type OnboardingFormData = z.infer<typeof OnboardingSchema>;


export async function submitOnboardingAction(formData: OnboardingFormData) {
    // --- PAS 1: INICIALITZACIÓ I AUTENTICACIÓ ---
    const supabase = createClient();
    const supabaseAdmin = createAdminClient();
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }

    // --- PAS 2: VALIDACIÓ DE DADES AMB ZOD ---
    const validationResult = OnboardingSchema.safeParse(formData);

    if (!validationResult.success) {
        return { success: false, message: validationResult.error.issues[0].message };
    }
    
    const validData = validationResult.data;
    
    try {
        // --- 1. PREPAREM LES DADES PER A LA INSERCIÓ ---
        const profileUpdateData = {
            full_name: formData.full_name,
            phone: formData.phone || null,
            onboarding_completed: true,
        };

        const teamInsertData = {
            name: formData.company_name,
            owner_id: user.id,
            tax_id: formData.tax_id,
            website: formData.website,
            summary: formData.summary,
            sector: formData.sector,
            services: formData.services,
            phone: formData.phone,
            email: user.email,
            address: [formData.street, formData.city, formData.postal_code, formData.country].filter(Boolean).join(', '),
            street: formData.street,
            city: formData.city,
            postal_code: formData.postal_code,
            region: formData.region,
            country: formData.country,
            latitude: formData.latitude,
            longitude: formData.longitude,
        };

        // --- 2. EXECUTEM LES OPERACIONS A LA BASE DE DADES ---

        // Actualitzem el perfil personal de l'usuari
        await supabase.from('profiles').update(profileUpdateData).eq('id', user.id).throwOnError();
        
        // Creem l'equip
        const { data: newTeam } = await supabase.from('teams').insert(teamInsertData).select('id').single().throwOnError();
        
        // Afegim l'usuari com a 'owner' de l'equip
        await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' }).throwOnError();

        // ✅ *** INICI DE LA CORRECCIÓ ***
        // --- 3. CREEM ELS PIPELINE STAGES PER AL NOU EQUIP ---
        // Ara que tenim 'newTeam.id', podem crear les etapes correctament.
        const defaultStages = [
          { name: 'Prospecte', position: 1 },
          { name: 'Contactat', position: 2 },
          { name: 'Proposta Enviada', position: 3 },
          { name: 'Negociació', position: 4 },
          { name: 'Guanyat', position: 5 },
          { name: 'Perdut', position: 6 }
        ];

        // Preparem les etapes amb el team_id i el user_id
        const stagesToInsert = defaultStages.map(stage => ({
          name: stage.name,
          "position": stage.position,
          team_id: newTeam.id, // ✅ LA CLAU: Associem amb el NOU team_id
          user_id: user.id       // Mantenim l'associació amb l'usuari (com feia la teva funció)
        }));

        // Inserim les 6 etapes
        await supabase.from('pipeline_stages').insert(stagesToInsert).throwOnError();
        // ✅ *** FI DE LA CORRECCIÓ ***

        // --- 4. CONTINUEM AMB SUBSCRIPTIONS I AUTH UPDATE ---
        await supabaseAdmin.from('subscriptions').insert({
            team_id: newTeam.id,
            plan_id: 'free',
            status: 'active'
        }).throwOnError();

        await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
                app_metadata: {
                    ...user.app_metadata,
                    active_team_id: newTeam.id,
                    active_team_plan: 'free'
                },
                user_metadata: {
                    ...user.user_metadata,
                    full_name: validData.full_name
                }
            }
        );
        
    } catch (error) {
        const message = error instanceof Error ? error.message : "Hi ha hagut un error desconegut.";
        console.error("Error durant l'acció d'Onboarding:", message);
        return { success: false, message: "No s'ha pogut completar el registre. Intenta-ho de nou." };
    }

    // --- PAS 5: REDIRECCIÓ SI TOT HA ANAT BÉ ---
    await supabase.auth.refreshSession();

    const locale = (await headers()).get('x-next-intl-locale') || 'ca';
    redirect(`/${locale}/dashboard`);
}