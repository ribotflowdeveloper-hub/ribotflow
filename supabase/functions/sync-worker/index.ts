// supabase/functions/sync-worker/index.ts
import { serve } from "std/http/server.ts"; // <-- CORREGIT
import { handleSyncRequest } from './_lib/handler.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Tota la lògica complexa està ara a 'handleSyncRequest'
    const response = await handleSyncRequest(req);
    
    // Afegim capçaleres CORS a la resposta exitosa
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  
  } catch (err) {
    // Gestió d'errors centralitzada
    const errorMessage = typeof err === 'object' && err !== null && 'message' in err 
      ? (err as Error).message 
      : String(err);
      
    console.error(`[Worker Error General]:`, errorMessage);
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});