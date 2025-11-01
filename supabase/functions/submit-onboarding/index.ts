import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "shared/cors.ts";

/**
 * Aquesta Edge Function processa les dades del formulari d'onboarding d'un nou usuari.
 * Les seves responsabilitats són:
 * 1. Rebre les dades del perfil enviades des del client.
 * 2. Convertir l'adreça de l'empresa en coordenades geogràfiques (geocodificació).
 * 3. Desar tota la informació (dades del perfil + coordenades) a la base de dades.
 * 4. Marcar l'onboarding de l'usuari com a completat.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extraiem les dades del perfil i l'ID de l'usuari del cos de la petició.
    const { profileData, userId } = await req.json();
    if (!profileData || !userId) throw new Error("Falten dades del perfil o l'ID de l'usuari.");
    
    // Creem un client de Supabase ADMINISTRATIU (amb la Service Role Key)
    // per poder modificar la taula 'profiles' sense restriccions.
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Creem una còpia de les dades rebudes per anar-hi afegint la nova informació.
    const dataToUpdate = { ...profileData };

    // 1. Procés de Geocodificació (si s'ha proporcionat una adreça).
    if (profileData.company_address) {
      const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        profileData.company_address
      )}.json?access_token=${mapboxToken}&limit=1`;
      
      const geoResponse = await fetch(geocodingUrl);
      const geoData = await geoResponse.json();

      if (geoData.features && geoData.features.length > 0) {
        const [longitude, latitude] = geoData.features[0].center;
        // Afegim les coordenades a l'objecte de dades que actualitzarem.
        dataToUpdate.latitude = latitude;
        dataToUpdate.longitude = longitude;
        console.log(`Coordenades trobades per ${userId}:`, { latitude, longitude });
      } else {
        console.log(`No s'han trobat coordenades per a l'adreça: ${profileData.company_address}`);
      }
    }

    // 2. Assegurem que el procés d'onboarding es marca com a completat.
    // Aquesta lògica es fa al servidor per garantir la integritat de les dades,
    // independentment del que enviï el client.
    dataToUpdate.onboarding_completed = true;

    // 3. Fem UNA ÚNICA crida a la base de dades per actualitzar el perfil
    // amb totes les dades recollides (perfil + coordenades + estat d'onboarding).
    // Aquesta operació única és més eficient.
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(dataToUpdate)
      .eq('id', userId);

    if (error) throw error;
    console.log(`Perfil ${userId} actualitzat i onboarding completat.`);

    // Retornem una resposta d'èxit.
    return new Response(JSON.stringify({ message: "Perfil actualitzat correctament" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error a la funció submit-onboarding:', error);
    const errorMessage = (error instanceof Error) ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});