import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  // Gestió de la petició pre-flight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { profileData, userId } = await req.json();
    
    // Validació de les dades rebudes
    if (!profileData || !userId) {
      throw new Error("Falten dades del perfil o l'ID de l'usuari.");
    }
    
    // Creem el client d'administració de Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // MILLORA: Realitzem UNA ÚNICA operació d'actualització
    // El 'profileData' que arriba del client ja hauria d'incloure 
    // la latitud i la longitud, així que no cal fer cap altra crida a Mapbox.
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(profileData) // profileData ja conté { street, city, ..., latitude, longitude }
      .eq('id', userId);

    if (error) {
      // Si hi ha un error a la base de dades, el llancem
      throw error;
    }
    
    console.log(`Perfil ${userId} actualitzat correctament amb totes les dades.`);

    // Retornem una resposta d'èxit
    return new Response(JSON.stringify({ message: "Perfil actualitzat correctament" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Gestió centralitzada d'errors
    console.error('Error a la funció submit-onboarding:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
