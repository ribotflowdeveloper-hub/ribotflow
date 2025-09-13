// /supabase/functions/submit-onboarding/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { profileData, userId } = await req.json();
    if (!profileData || !userId) throw new Error("Falten dades del perfil o l'ID de l'usuari.");
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Creem un objecte per anar acumulant totes les dades a actualitzar.
    const dataToUpdate = { ...profileData };

    // 1. Fem la geocodificació si tenim una adreça.
    if (profileData.company_address) {
      const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
      const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        profileData.company_address
      )}.json?access_token=${mapboxToken}&limit=1`;
      
      const geoResponse = await fetch(geocodingUrl);
      const geoData = await geoResponse.json();

      if (geoData.features && geoData.features.length > 0) {
        const [longitude, latitude] = geoData.features[0].center;
        // Afegim les coordenades a l'objecte que actualitzarem.
        dataToUpdate.latitude = latitude;
        dataToUpdate.longitude = longitude;
        console.log(`Coordenades trobades per ${userId}:`, { latitude, longitude });
      } else {
        console.log(`No s'han trobat coordenades per a l'adreça: ${profileData.company_address}`);
      }
    }

    // 2. ✅ CORRECCIÓ PRINCIPAL:
    // Assegurem que l'onboarding es marca com a completat a nivell de servidor.
    // Això és més segur i garanteix que sempre s'estableixi correctament.
    dataToUpdate.onboarding_completed = true;

    // 3. Fem UNA SOLA actualització a la base de dades amb totes les dades.
    // Aquesta operació és atòmica i més eficient.
    const { error } = await supabaseAdmin
      .from('profiles')
      .update(dataToUpdate)
      .eq('id', userId);

    if (error) throw error;
    console.log(`Perfil ${userId} actualitzat i onboarding completat.`);

    return new Response(JSON.stringify({ message: "Perfil actualitzat correctament" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error a la funció submit-onboarding:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});