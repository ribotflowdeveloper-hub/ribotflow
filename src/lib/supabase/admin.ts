// A /lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js';

// NOTA: Aquest client NOMÉS s'ha d'utilitzar en entorns de servidor (Server Actions, Route Handlers).
// Mai l'exposis al client!
export const createAdminClient = () => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase URL or service role key is missing.');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};