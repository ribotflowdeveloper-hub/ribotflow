// src/app/[locale]/(app)/settings/integrations/actions.ts (FITXER CORREGIT I NET)
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';
import { validatePageSession, validateUserSession } from "@/lib/supabase/session";

// ❌ Eliminem importacions de: nodemailer, imap-simple, AES, ImapSmtpSchema

// ✅ 1. Importem el NOU servei i els seus tipus
import * as integrationsService from '@/lib/services/settings/integrations/integrations.service';
import type { ImapSmtpFormData } from './schemas';
import type { ImapFormState, DisconnectFormState } from '@/lib/services/settings/integrations/integrations.service';


// --- LÒGICA DE CONNEXIÓ OAUTH ---
// (AQUESTA PART ES MANTÉ IGUAL, JA QUE ÉS LÒGICA DE FLUX/CONTROLADOR)

type OAuthProvider = 'google_gmail' | 'google_calendar' | 'microsoft' | 'linkedin' | 'facebook';

async function createOAuthRedirectAction(provider: OAuthProvider) {
    await validatePageSession();
    const cookieStore = cookies();
    const state = uuidv4();
    (await cookieStore).set('oauth_state', state, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/${provider}`;
    let authUrl = '';
    const params = new URLSearchParams({ state, redirect_uri: redirectUri });

    switch (provider) {
        case 'google_gmail':
            params.set('client_id', process.env.GOOGLE_CLIENT_ID!);
            params.set('response_type', 'code');
            params.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email');
            params.set('access_type', 'offline');
            params.set('prompt', 'consent');
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            break;
        
        case 'google_calendar':
            params.set('client_id', process.env.GOOGLE_CLIENT_ID!);
            params.set('response_type', 'code');
            params.set('scope', 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email');
            params.set('access_type', 'offline');
            params.set('prompt', 'consent');
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            break;

        case 'microsoft':
            params.set('client_id', process.env.AZURE_CLIENT_ID!);
            params.set('response_type', 'code');
            params.set('scope', 'openid email offline_access User.Read Mail.Read Mail.Send');
            authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
            break;
        
        case 'linkedin':
            params.set('client_id', process.env.LINKEDIN_CLIENT_ID!);
            params.set('response_type', 'code');
            params.set('scope', 'openid profile email w_member_social');
            params.set('prompt', 'consent');
            authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
            break;

        case 'facebook':
            const scopes = 'pages_show_list,pages_manage_posts,business_management,instagram_basic,instagram_content_publish';
            params.set('client_id', process.env.FACEBOOK_CLIENT_ID!);
            params.set('response_type', 'code');
            params.set('scope', scopes);
            authUrl = `https://www.facebook.com/v19.0/dialog/oauth?${params.toString()}`;
            break;
    }

    redirect(authUrl);
}

// Accions públiques de connexió OAuth (sense canvis)
export async function connectGoogleGmailAction() { return createOAuthRedirectAction('google_gmail'); }
export async function connectGoogleCalendarAction() { return createOAuthRedirectAction('google_calendar'); }
export async function connectMicrosoftAction() { return createOAuthRedirectAction('microsoft'); }
export async function connectLinkedInAction() { return createOAuthRedirectAction('linkedin'); }
export async function connectFacebookAction() { return createOAuthRedirectAction('facebook'); }


// --- LÒGICA PER A IMAP/SMTP (REFACTORITZADA) ---

// ❌ Les funcions 'verifyImap' i 'verifySmtp' s'han mogut al servei.

export async function connectImapSmtpAction(formData: ImapSmtpFormData): Promise<ImapFormState> {
    // 1. Validació de sessió
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: "Sessió no vàlida." };
    }
    const { supabase, user } = session;

    // 2. Crida al servei
    // Tota la lògica de validació, verificació, encriptació i BBDD està al servei.
    const result = await integrationsService.connectImapSmtp(supabase, user, formData);
    
    // 3. Efectes (revalidació)
    if (result.success) {
        revalidatePath('/settings/integrations');
    }

    return result;
}


// --- ACCIONS DE DESCONNEXIÓ (REFACTORITZADES) ---

async function handleDisconnect(provider: string): Promise<DisconnectFormState> {
    // 1. Validació de sessió
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    // 2. Crida al servei
    const result = await integrationsService.disconnectIntegration(supabase, user, activeTeamId, provider);
    
    // 3. Efectes (revalidació)
    if (result.success) {
        revalidatePath('/settings/integrations');
    }

    return result;
}

// Accions públiques de desconnexió (ara criden al 'handleDisconnect' refactoritzat)
export async function disconnectGoogleGmailAction() { return await handleDisconnect('google_gmail'); }
export async function disconnectGoogleCalendarAction() { return await handleDisconnect('google_calendar'); }
export async function disconnectMicrosoftAction() { return await handleDisconnect('microsoft'); }
export async function disconnectLinkedInAction() { return await handleDisconnect('linkedin'); }
export async function disconnectFacebookAction() { return await handleDisconnect('facebook'); }
export async function disconnectCustomEmailAction() { return await handleDisconnect('custom_email'); }