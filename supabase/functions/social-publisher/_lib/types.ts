// Tipus inferits de /_lib/db.ts
export interface Post {
    id: number;
    team_id: string;
    user_id: string; // Necessari per a les notificacions
    provider: string[];
    content: string | null;
    media_url: string[] | null;
    media_type: 'image' | 'video' | null;
    status: 'scheduled' | 'published' | 'partial_success' | 'failed';
    scheduled_at: string;
}
  
export interface Credentials {
    access_token: string;
    refresh_token: string | null; // L'afegim per a futures revisions de refresc
    provider_user_id: string | null;
    provider_page_id: string | null;
}

// Tipus inferits de /_lib/publishers.ts
export interface FacebookBody {
    message?: string;
    access_token: string;
    attached_media?: { media_fbid: string }[];
    caption?: string | null;
    url?: string;
    description?: string | null;
    file_url?: string;
}