// /supabase/functions/geocode-address/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0';

// Tipus per a les dades que rebem del webhook
interface Profile {
  id: string;
  company_address: string;
}

serve(async (req) => {
  try {
    const { record } = await req.json();
    const profile: Profile = record;

    // Assegura't que tenim una adreça per processar
    if (!profile.company_address) {
      console.log('No address provided for profile:', profile.id);
      return new Response(JSON.stringify({ message: 'No address to geocode' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Crida a l'API de geocodificació de Mapbox
    const mapboxToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      profile.company_address
    )}.json?access_token=${mapboxToken}&limit=1`;

    const geoResponse = await fetch(geocodingUrl);
    const geoData = await geoResponse.json();

    if (geoData.features && geoData.features.length > 0) {
      const coordinates = geoData.features[0].center;
      const [longitude, latitude] = coordinates;

      // Crea el client de Supabase per actualitzar la taula
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Actualitza el perfil amb les noves coordenades
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ latitude, longitude })
        .eq('id', profile.id);

      if (error) throw error;

      return new Response(JSON.stringify({ latitude, longitude }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      throw new Error('Geocoding failed, no features found.');
    }
  } catch (error) {
    console.error('Error in geocode function:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});