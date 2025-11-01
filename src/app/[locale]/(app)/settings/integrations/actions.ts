/**
 * @file actions.ts (Integrations)
 * @summary Versió actualitzada per a Google Calendar (separat de Gmail).
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';
import { validatePageSession, validateUserSession } from "@/lib/supabase/session";
import { type TransportOptions } from 'nodemailer';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';

import { ImapSmtpSchema, type ImapSmtpFormData } from './schemas';
import AES from 'crypto-js/aes';

// --- LÒGICA DE CONNEXIÓ CENTRALITZADA ---

// ✅ NOU: Tipus de provider actualitzat
type OAuthProvider = 'google_gmail' | 'google_calendar' | 'microsoft' | 'linkedin' | 'facebook';

async function createOAuthRedirectAction(provider: OAuthProvider) {
    // Utilitzem validatePageSession perquè l'acció principal és una redirecció.
    await validatePageSession();

    const cookieStore = cookies();
    const state = uuidv4();
    // ✅ CORRECCIÓ: No cal 'await' a cookieStore.set
    (await
        // ✅ CORRECCIÓ: No cal 'await' a cookieStore.set
        cookieStore).set('oauth_state', state, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    // ✅ NOU: La redirectUri ara és dinàmica basada en el provider
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/${provider}`;
    let authUrl = '';
    const params = new URLSearchParams({ state, redirect_uri: redirectUri });

    switch (provider) {
        case 'google_gmail': // ✅ RENOMBRAT: Abans 'google'
            params.set('client_id', process.env.GOOGLE_CLIENT_ID!);
            params.set('response_type', 'code');
            // ✅ NOU: Afegit 'userinfo.email' per obtenir l'email al callback
            params.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email');
            params.set('access_type', 'offline');
            params.set('prompt', 'consent');
            authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
            break;
        
        case 'google_calendar': // ✅ NOU: Cas específic per a Calendar
            params.set('client_id', process.env.GOOGLE_CLIENT_ID!);
            params.set('response_type', 'code');
            // Scopes per a Calendar (lectura/escriptura) i 'userinfo.email'
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
        
        // ... (els teus casos de 'linkedin' i 'facebook' es queden igual) ...
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

// ✅ NOU: Accions públiques actualitzades
export async function connectGoogleGmailAction() { return createOAuthRedirectAction('google_gmail'); }
export async function connectGoogleCalendarAction() { return createOAuthRedirectAction('google_calendar'); }
export async function connectMicrosoftAction() { return createOAuthRedirectAction('microsoft'); }
export async function connectLinkedInAction() { return createOAuthRedirectAction('linkedin'); }
export async function connectFacebookAction() { return createOAuthRedirectAction('facebook'); }


// --- LÒGICA PER A IMAP/SMTP (Sense canvis) ---
type ImapConfig = {
    imap: {
        user: string;
        password: string;
        host: string;
        port: number;
        tls: boolean;
        authTimeout: number;
        tlsOptions?: {
            rejectUnauthorized?: boolean;
        };

    }
}
async function verifyImap(config: ImapConfig): Promise<void> {
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.end();
    } catch (err) {
        throw new Error(`Error de connexió IMAP: ${(err as Error).message}`);
    }
}
async function verifySmtp(config: TransportOptions): Promise<void> {
    const transporter = nodemailer.createTransport(config);
    try {
        await transporter.verify();
    } catch (err) {
        throw new Error(`Error de connexió SMTP: ${(err as Error).message}`);
    }
}
export async function connectImapSmtpAction(formData: ImapSmtpFormData) {
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: "Sessió no vàlida." };
    }
    const { supabase, user } = session;

    const validation = ImapSmtpSchema.safeParse(formData);
    if (!validation.success) {
        return { success: false, message: "Dades del formulari invàlides.", errors: validation.error.flatten().fieldErrors };
 }
    const { email, password, imapHost, imapPort, smtpHost, smtpPort } = validation.data;

    const imapConfig: ImapConfig = { imap: { user: email, password: password, host: imapHost, port: imapPort, tls: true, authTimeout: 5000, tlsOptions: { rejectUnauthorized: false } } };
    const smtpConfig = { host: smtpHost, port: smtpPort, secure: smtpPort === 465, auth: { user: email, pass: password }, tls: { rejectUnauthorized: false } };

    try {
        await Promise.all([
            verifyImap(imapConfig),
            verifySmtp(smtpConfig as TransportOptions) 
        ]);
    } catch (error) {
        return { success: false, message: `No s'ha pogut verificar la connexió: ${(error as Error).message}` };
    }
    
    try {
        const secretKey = process.env.ENCRYPTION_SECRET_KEY;
        if (!secretKey) {
            throw new Error("La clau d'encriptació no està configurada al servidor.");
        }

        const encryptedPassword = AES.encrypt(password, secretKey).toString();
        
        const configPayload = {
            imap: { user: imapConfig.imap.user, host: imapConfig.imap.host, port: imapConfig.imap.port, tls: imapConfig.imap.tls, authTimeout: imapConfig.imap.authTimeout, },
            smtp: { host: smtpConfig.host, port: smtpConfig.port, secure: smtpConfig.secure, auth: { user: smtpConfig.auth.user, }, },
        };
        
        const { error: dbError } = await supabase.from('user_credentials').upsert({ 
            user_id: user.id, 
            provider: 'custom_email', 
            config: configPayload, 
            encrypted_password: encryptedPassword,
            access_token: null, 
            refresh_token: null, 
            expires_at: null, 
        }, { onConflict: 'user_id, provider' });
        
        if (dbError) throw dbError;
        
        revalidatePath('/settings/integrations');
        return { success: true, message: "Compte de correu connectat correctament!" };

    } catch (error) {
        console.error("Error en connectImapSmtpAction:", error);
        const errorMessage = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message: `Error en el procés de connexió: ${errorMessage}` };
    }
}


// --- ACCIONS DE DESCONNEXIÓ (REFATORITZADES) ---

// Aquesta funció ja està preparada per a 'google_gmail' i 'google_calendar'
async function handleDisconnect(provider: string) {
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    try {
        const isTeamIntegration = ['linkedin', 'facebook', 'instagram'].includes(provider);
        let query;

        if (isTeamIntegration) {
            query = supabase.from('team_credentials').delete().match({ team_id: activeTeamId, provider });
        } else {
            // ✅ CORRECCIÓ: 'google' ja no existeix, però la lògica és correcta.
            query = supabase.from('user_credentials').delete().match({ user_id: user.id, provider });
        }

        const { error } = await query;
        if (error) throw error;

        revalidatePath('/settings/integrations');
        return { success: true, message: `Integració desconnectada correctament.` };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message: `No s'ha pogut desconnectar: ${errorMessage}` };
    }
}

// ✅ NOU: Accions de desconnexió actualitzades
export async function disconnectGoogleGmailAction() { return await handleDisconnect('google_gmail'); }
export async function disconnectGoogleCalendarAction() { return await handleDisconnect('google_calendar'); }
export async function disconnectMicrosoftAction() { return await handleDisconnect('microsoft'); }
export async function disconnectLinkedInAction() { return await handleDisconnect('linkedin'); }
export async function disconnectFacebookAction() { return await handleDisconnect('facebook'); }
export async function disconnectCustomEmailAction() { return await handleDisconnect('custom_email'); }