import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User, SupabaseClient } from "@supabase/supabase-js";

// Aquest tipus representa una sessió completament validada.
export type ValidatedSession = {
    supabase: SupabaseClient;
    user: User;
    activeTeamId: string;
};

// Aquest tipus representa una resposta d'error estandarditzada.
export type SessionError = {
    error: { message: string };
};

// A /lib/session.ts (o on tinguis aquest codi)

// Funció base que conté la lògica comuna
async function getSessionCore() {
    const supabase = createClient(); // Tipat amb <Database> per defecte
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { user: null, supabase: null, activeTeamId: null };
    }

    // 1. (FONT PRIMÀRIA) Intentem obtenir-ho del token (metadades)
    let activeTeamId = user.app_metadata?.active_team_id as string | null;

    // 2. (FALLBACK) Si no hi és, el busquem al perfil.
    // Aquesta lògica ara està centralitzada aquí.
    if (!activeTeamId) {
        console.warn("active_team_id no trobat a app_metadata. Fent fallback a 'profiles'.");
        const { data: profile } = await supabase
            .from('profiles')
            .select('active_team_id')
            .eq('id', user.id)
            .single();
        
        activeTeamId = profile?.active_team_id ?? null;
    }

    // 3. Retornem la informació de sessió bàsica
    return { user, supabase, activeTeamId };
}

// Nova versió per a Server Actions
export async function validateUserSession(): Promise<ValidatedSession | SessionError> {
    const { user, supabase, activeTeamId } = await getSessionCore();

    if (!user || !supabase) {
        return { error: { message: "Usuari no autenticat." } };
    }
    if (!activeTeamId) {
        return { error: { message: "No s'ha pogut determinar l'equip actiu." } };
    }

    // El tipat ens assegura que user i supabase no són nulls aquí
    return { supabase, user, activeTeamId };
}

// Nova versió per a Pàgines
export async function validatePageSession() {
    const { user, supabase, activeTeamId } = await getSessionCore();

    if (!user) {
        redirect('/login');
    }
    if (!activeTeamId) {
        // Redirigim a un lloc on pugui crear o seleccionar un equip
        redirect('/settings/team');
    }
    
    // El redirect atura l'execució, així que sabem que aquí tot és vàlid
    // supabase! és segur gràcies a la comprovació de !user
  
    return { supabase: supabase!, user, activeTeamId };
}