// Definim un tipus de dades estricte per a l'entrada de la funció
export type ProfileData = {
    full_name: string;
    company_name: string;
    summary: string;
    company_phone: string;
    services: string[];
    street: string;
    city: string;
    postal_code: string;
    region: string;
    country: string;
    latitude?: number;
    longitude?: number;
};

export type Profile = {
    id: string; // Coincideix amb auth.users.id
    full_name: string | null;
    phone: string | null;
    avatar_url: string | null;
    job_title: string | null;
    onboarding_completed: boolean;
};