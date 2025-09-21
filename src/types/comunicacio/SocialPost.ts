// ✅ NOU: Tipus per a una publicació social, tal com la guardem a la base de dades.
export interface SocialPost {
  id: number;
  user_id: string;
  provider: string[];
  content: string | null;
  media_url: string | null;
  media_type: string | null;
  // ✅ NOU: Afegim 'partial_success' als estats possibles.
  status: 'draft' | 'scheduled' | 'published' | 'failed' | 'partial_success';
  scheduled_at: string | null;
  created_at: string;
}