import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
    try {
        // Obtenim l'usuari que fa la petició per saber el seu equip actiu
        const supabaseUserClient = createClient(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_ANON_KEY")!,
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );
        const { data: { user } } = await supabaseUserClient.auth.getUser();
        if (!user) throw new Error("Usuari no autenticat");

        const activeTeamId = user.app_metadata?.active_team_id;
        if (!activeTeamId) throw new Error("No s'ha pogut determinar l'equip actiu.");
        
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // ✅ CORRECCIÓ: Busquem les credencials a la taula 'team_credentials'
        // utilitzant l'ID de l'equip actiu de l'usuari.
        const { data: creds, error: credsError } = await supabaseAdmin
            .from("team_credentials")
            .select("access_token")
            .eq("team_id", activeTeamId)
            .eq("provider", "facebook")
            .single();

        if (credsError || !creds?.access_token) {
            console.warn("No s'han trobat credencials de Facebook per a l'equip actiu:", activeTeamId);
            return new Response(JSON.stringify({ message: "No hi havia cap token de Facebook per a revocar." }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // L'endpoint per a revocar permisos a Facebook
        const revokeUrl = `https://graph.facebook.com/v19.0/me/permissions`;
        const body = new URLSearchParams({ access_token: creds.access_token });

        const response = await fetch(revokeUrl, {
            method: 'DELETE',
            body: body
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("Error de l'API de Facebook en revocar:", errorData);
        }
        
        return new Response(JSON.stringify({ message: "Petició de revocació enviada a Facebook." }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500
        });
    }
});