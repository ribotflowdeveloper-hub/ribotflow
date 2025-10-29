// supabase/functions/send-quote-pdf/_lib/types.ts (REFACTORITZAT AMB IMPORTS)

// ❗ Ajusta aquesta ruta relativa segons la teva estructura exacta de carpetes
// Des de supabase/functions/send-quote-pdf/_lib/ fins a src/
import type { Database } from "../../../../src/types/supabase.ts"; 
// Alternativament, si tens tipus específics ja extrets:
// import type { Quote as AppQuote, Contact as AppContact, Profile as AppProfile } from "../../../../src/types/index.ts"; // O la ruta correcta

// --- Tipus Derivats de la Base de Dades (Ara importants) ---
// Extraiem els tipus de les taules directament des de la definició global
export type Quote = Database['public']['Tables']['quotes']['Row'] & {
    // Afegim la relació que sabem que carreguem amb el select('*')
    contacts: Contact | null; 
};
export type Contact = Database['public']['Tables']['contacts']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserCredentials = Database['public']['Tables']['user_credentials']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
// --- Tipus Específics de l'Edge Function (Aquests es mantenen) ---

// Tipus per a la resposta de Google OAuth
export type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  scope?: string;
  token_type?: string;
  id_token?: string; // Pot venir si demanes 'openid'
  error?: string; // Per a errors OAuth
  error_description?: string;
};

// Tipus per a les dades agregades després de la primera càrrega
export type FetchedData = {
  quote: Quote; // Ara és el tipus complet importat
  contact: Contact; // Ara és el tipus complet importat (validat com a no nul)
  profile: Profile | null; // Ara és el tipus complet importat
  companyName: string; // Aquesta és una dada derivada
};

// Tipus per a les dades d'autenticació obtingudes dins la funció
export type AuthData = {
  user: { id: string; email?: string }; // L'usuari obtingut del JWT
  accessToken: string; // L'Access Token de Google
};