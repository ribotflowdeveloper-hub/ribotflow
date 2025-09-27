"use server";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { cookies, headers } from "next/headers";


import { redirect } from "next/navigation";

// Aquesta és la forma de les dades que el client enviarà
type OnboardingFormData = {
    full_name: string;
    company_name: string;
    tax_id: string;
    website: string;
    summary: string;
    sector: string;
    services: string[];
    phone: string;
    street: string;
    city: string;
    postal_code: string;
    region: string;
    country: string;
    latitude?: number;
    longitude?: number;
};

export async function submitOnboardingAction(formData: OnboardingFormData) {
    const supabase = createClient(cookies());
    const supabaseAdmin = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }

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
        
        // Creem el nou equip
        const { data: newTeam } = await supabase.from('teams').insert(teamInsertData).select('id').single().throwOnError();
        
        // Afegim l'usuari com a propietari a la taula de membres
        await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' }).throwOnError();
        
        // ✅ NOU PAS: Creem una subscripció 'free' per defecte per al nou equip
        await supabaseAdmin.from('subscriptions').insert({ 
            team_id: newTeam.id, 
            plan_id: 'free', 
            status: 'active' 
        }).throwOnError();

        // ✅ PAS CLAU: Actualitzem el token de l'usuari (app_metadata) a l'instant.
        await supabaseAdmin.auth.admin.updateUserById(
            user.id,
            {
                app_metadata: { 
                    ...user.app_metadata, 
                    active_team_id: newTeam.id,
                    active_team_plan: 'free' // Establim el pla per defecte
                }
            }
        );
        await supabase.auth.refreshSession();

    } catch (error) {
        const message = error instanceof Error ? error.message : "Hi ha hagut un error desconegut.";
        console.error("Error a l'Onboarding:", message);
        return { success: false, message };
    }
    
    // ✅ PAS FINAL: Ara que l'acció ha acabat, redirigim l'usuari al dashboard.
    const locale = (await headers()).get('x-next-intl-locale') || 'ca';
    redirect(`/${locale}/dashboard`);
}