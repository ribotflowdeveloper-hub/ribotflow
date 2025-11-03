import { serve } from "std/http/server.ts"; 
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
    const response = await handleSyncRequest(req);
    
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
    return response;
  
  } catch (err) {
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