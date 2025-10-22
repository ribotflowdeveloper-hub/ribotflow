// supabase/functions/sync-worker/_lib/supabase.ts
import { createClient } from "@supabase/supabase-js"; // <-- CORREGIT

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceKey) {
  throw new Error("SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no estan definides.");
}

// Tipem el client per a més seguretat, tot i que no és estrictament necessari
import { SupabaseClient } from "@supabase/supabase-js";
export const supabaseAdmin: SupabaseClient = createClient(supabaseUrl, serviceKey);