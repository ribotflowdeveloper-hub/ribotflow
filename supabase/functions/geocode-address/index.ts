import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Definim un tipus per a les dades que esperem rebre. Aquesta funció probablement
// es crida a través d'un 'webhook' de base de dades cada cop que s'actualitza un perfil.
interface Profile {
  id: string;
  company_address: string;
}

/**
 * Aquesta Edge Function s'encarrega de convertir una adreça de text
 * (ex: "Carrer Major 1, Barcelona") en coordenades geogràfiques (latitud i longitud).
 * Utilitza l'API de Mapbox per a la geocodificació.
 */
serve(async (req) => {
  try {
    // El 'record' conté les dades de la fila que ha activat el webhook de la base de dades.
    const { record } = await req.json();
    const profile: Profile = record;

    // Si el perfil actualitzat no té una adreça, no fem res i acabem l'execució.
    if (!profile.company_address) {
      console.log('No address provided for profile:', profile.id);
      return new Response(JSON.stringify({ message: 'No address to geocode' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Obtenim el token d'accés de Mapbox des de les variables d'entorn segures.
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    // Construïm la URL per a la crida a l'API de Mapbox, codificant l'adreça per a seguretat.
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      profile.company_address
    )}.json?access_token=${mapboxToken}&limit=1`;

    // Fem la crida a l'API externa de Mapbox.
    const geoResponse = await fetch(geocodingUrl);
    const geoData = await geoResponse.json();

    // Si Mapbox ha trobat i retornat coordenades per a l'adreça...
    if (geoData.features && geoData.features.length > 0) {
      const coordinates = geoData.features[0].center;
      const [longitude, latitude] = coordinates;

      // Creem un client de Supabase ADMINISTRATIU (amb la Service Role Key)
      // per poder modificar la base de dades sense restriccions de RLS.
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Actualitzem el perfil a la base de dades amb les noves coordenades trobades.
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ latitude, longitude })
        .eq('id', profile.id);

      if (error) throw error; // Si hi ha un error a la base de dades, el llancem.

      // Retornem una resposta d'èxit.
      return new Response(JSON.stringify({ latitude, longitude }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Si Mapbox no troba resultats, llancem un error.
      throw new Error('Geocoding failed, no features found.');
    }
  } catch (error) {
    // Bloc per capturar qualsevol error durant el procés i retornar una resposta d'error 500.
    console.error('Error in geocode function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});