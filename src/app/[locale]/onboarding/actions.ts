// /app/[locale]/onboarding/actions.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// Definim un tipus per a les dades que rebem del client
type OnboardingFormData = {
    full_name: string;
    phone: string;
    company_name: string;
    tax_id: string;
    website: string;
    summary: string;
    sector: string;
    services: string[];
    street: string;
    city: string;
    postal_code: string;
    region: string;
    country: string;
};

// ✅ 1. CREEM UN TIPUS ESPECÍFIC PER A LES DADES DE L'EQUIP
// Aquest tipus descriu exactament les columnes que volem inserir a la taula 'teams'.
type TeamInsertData = {
    name: string;
    owner_id: string;
    tax_id?: string;
    website?: string;
    summary?: string;
    sector?: string;
    services?: string[];
    phone?: string;
    email?: string;
    address?: string;
    street?: string;
    city?: string;
    postal_code?: string;
    region?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
};


export async function submitOnboardingAction(formData: OnboardingFormData) {
    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, message: "Usuari no autenticat." };
    }

    // Preparem els objectes per a cada taula
    const profileUpdateData = {
        full_name: formData.full_name,
        phone: formData.phone || null,
        onboarding_completed: true,
    };

    // ✅ 2. UTILITZEM EL NOU TIPUS EN LLOC DE 'any'
    const teamInsertData: TeamInsertData = {
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
    };

    try {
        // --- LÒGICA DE GEOLOCALITZACIÓ ---
        if (formData.street && formData.city) {
            const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
            if (mapboxToken) {
                const fullAddress = `${formData.street}, ${formData.city}, ${formData.postal_code}`;
                const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddress)}.json?access_token=${mapboxToken}&limit=1`;
                
                const geoResponse = await fetch(geocodingUrl);
                const geoData = await geoResponse.json();

                if (geoData.features && geoData.features.length > 0) {
                    const [longitude, latitude] = geoData.features[0].center;
                    teamInsertData.latitude = latitude;
                    teamInsertData.longitude = longitude;
                }
            }
        }

        // --- EXECUTEM LES OPERACIONS A LA BASE DE DADES ---
        await supabase.from('profiles').update(profileUpdateData).eq('id', user.id).throwOnError();
        const { data: newTeam } = await supabase.from('teams').insert(teamInsertData).select('id').single().throwOnError();
        await supabase.from('team_members').insert({ team_id: newTeam.id, user_id: user.id, role: 'owner' }).throwOnError();

    } catch (error) {
        const message = error instanceof Error ? error.message : "Error desconegut.";
        return { success: false, message };
    }
    
    redirect('/');
}