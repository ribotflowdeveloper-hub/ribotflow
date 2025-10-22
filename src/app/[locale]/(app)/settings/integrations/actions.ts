/**
 * @file actions.ts (Integrations)
 * @summary Versió refactoritzada amb lògica centralitzada.
 */
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { v4 as uuidv4 } from 'uuid';
// ✅ 1. Importem les dues utilitats de sessió.
import { validatePageSession, validateUserSession } from "@/lib/supabase/session";
import { type TransportOptions } from 'nodemailer';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';

import { ImapSmtpSchema, type ImapSmtpFormData } from './schemas';
import AES from 'crypto-js/aes';
// --- LÒGICA DE CONNEXIÓ CENTRALITZADA ---

/**
 * ✅ 2. Nova funció interna que gestiona tota la lògica de connexió OAuth.
 * Això elimina la repetició de codi a les quatre accions públiques.
*/
async function createOAuthRedirectAction(provider: 'google' | 'microsoft' | 'linkedin' | 'facebook') {
    // Utilitzem validatePageSession perquè l'acció principal és una redirecció.
    // Aquesta funció ja s'encarrega de redirigir a /login si l'usuari no està autenticat.
    await validatePageSession();

    const cookieStore = cookies();
    const state = uuidv4();
    (await cookieStore).set('oauth_state', state, { path: '/', httpOnly: true, secure: process.env.NODE_ENV === 'production' });

    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/oauth/callback/${provider}`;
    let authUrl = '';
    const params = new URLSearchParams({ state, redirect_uri: redirectUri });

    // Configurem els paràmetres específics per a cada proveïdor
    switch (provider) {
        case 'google':
            params.set('client_id', process.env.GOOGLE_CLIENT_ID!);
            params.set('response_type', 'code');
            params.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send');
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

// ✅ 3. Les accions públiques ara són simples crides a la nostra funció central.
export async function connectGoogleAction() { return createOAuthRedirectAction('google'); }
export async function connectMicrosoftAction() { return createOAuthRedirectAction('microsoft'); }
export async function connectLinkedInAction() { return createOAuthRedirectAction('linkedin'); }
export async function connectFacebookAction() { return createOAuthRedirectAction('facebook'); }


// --- LÒGICA PER A IMAP/SMTP (AMB CORRECCIONS FINALS) ---
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
        
        if (dbError) {
            // Si hi ha un error guardant a la BD, el llancem perquè el catch el capturi
            throw dbError;
        };
        
        revalidatePath('/settings/integrations');
        return { success: true, message: "Compte de correu connectat correctament!" };

    } catch (error) {
        // ✅ PAS DE DEPURACIÓ: Mostrarem aquest error desconegut per consola
        console.error("=============== ERROR DESCONEGUT CAPTURAT ===============");
        console.error(error);
        console.error("==========================================================");

        const errorMessage = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message: `Error en el procés de connexió: ${errorMessage}` };
    }
}


// --- ACCIONS DE DESCONNEXIÓ (REFATORITZADES) ---

async function handleDisconnect(provider: string) {
    // ✅ 4. Utilitzem validateUserSession perquè aquesta funció retorna un objecte de resultat.
    const session = await validateUserSession();
    if ("error" in session) {
        return { success: false, message: session.error.message };
    }
    const { supabase, user, activeTeamId } = session;

    try {
        const isTeamIntegration = ['linkedin', 'facebook', 'instagram'].includes(provider);
        let query;

        if (isTeamIntegration) {
            // La nostra funció ja valida que activeTeamId existeix.
            query = supabase.from('team_credentials').delete().match({ team_id: activeTeamId, provider });
        } else {
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

export async function disconnectGoogleAction() { return await handleDisconnect('google'); }
export async function disconnectMicrosoftAction() { return await handleDisconnect('microsoft'); }
export async function disconnectLinkedInAction() { return await handleDisconnect('linkedin'); }
export async function disconnectFacebookAction() { return await handleDisconnect('facebook'); }
// Actualitzem handleDisconnect per incloure 'custom_email'
export async function disconnectCustomEmailAction() {
    return await handleDisconnect('custom_email');
}

