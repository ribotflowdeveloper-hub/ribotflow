// Ubicació: /supabase/functions/social-publisher/_lib/types.ts

export interface Post {
    id: number;
    team_id: string | null;
    user_id: string | null;
    provider: string[];
    content: string;
    media_url?: string[];
    media_type?: 'image' | 'video' | null; // Pot ser null
}

export interface Credentials {
    access_token: string;
    provider_user_id?: string;
    provider_page_id?: string;
}

// ✅ CORRECCIÓ: Afegim el tipus que faltava
export type FacebookBody = {
    message?: string;
    caption?: string;
    description?: string;
    file_url?: string;
    url?: string;
    access_token: string;
    attached_media?: { media_fbid: string }[];
};