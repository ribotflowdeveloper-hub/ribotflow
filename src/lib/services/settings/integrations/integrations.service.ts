// src/lib/services/settings/integrations.service.ts (FITXER NOU I COMPLET)
"use server";

import { type SupabaseClient, type User } from '@supabase/supabase-js';
import { type Database } from '@/types/supabase';
import { type TransportOptions } from 'nodemailer';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import AES from 'crypto-js/aes';

import { ImapSmtpSchema, type ImapSmtpFormData } from '@/app/[locale]/(app)/settings/integrations/schemas';

// --- Tipus Públics del Servei ---

// El que espera 'IntegrationsClient'
export type ConnectionStatuses = {
  google_gmail: boolean;
  google_calendar: boolean;
  microsoft: boolean;
  linkedin: boolean;
  facebook: boolean;
  instagram: boolean;
  custom_email: boolean;
};

// El que espera 'useFormState' per a IMAP
export type ImapFormState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
};

// El que esperen les accions de desconnexió
export type DisconnectFormState = {
  success: boolean;
  message: string;
};

// ---
// ⚙️ FUNCIONS DE LECTURA (per a la pàgina)
// ---

/**
 * SERVEI: Obté l'estat de totes les connexions per a l'usuari i equip actius.
 * (Aquesta lògica estava abans a 'IntegrationsData.tsx')
 */
export async function getIntegrationStatuses(
  supabase: SupabaseClient<Database>,
  userId: string,
  teamId: string
): Promise<ConnectionStatuses> {

  const [userCredsRes, teamCredsRes] = await Promise.all([
    supabase.from('user_credentials').select('provider').eq('user_id', userId),
    supabase.from('team_credentials').select('provider').eq('team_id', teamId)
  ]);

  const userProviders = userCredsRes.data?.map(c => c.provider) || [];
  const teamProviders = teamCredsRes.data?.map(c => c.provider) || [];

  const allConnectedProviders = new Set([...userProviders, ...teamProviders]);

  return {
    google_gmail: allConnectedProviders.has('google_gmail'),
    google_calendar: allConnectedProviders.has('google_calendar'),
    microsoft: allConnectedProviders.has('microsoft'),
    linkedin: allConnectedProviders.has('linkedin'),
    facebook: allConnectedProviders.has('facebook'),
    instagram: allConnectedProviders.has('instagram'),
    custom_email: allConnectedProviders.has('custom_email'),
  };
}

// ---
// ⚙️ FUNCIONS DE MUTACIÓ (per a les Server Actions)
// ---

// --- Lògica IMAP/SMTP ---

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

/**
 * SERVEI: Connecta un compte IMAP/SMTP personalitzat.
 * Inclou validació, verificació de connexió, encriptació i desat a BBDD.
 */
export async function connectImapSmtp(
  supabase: SupabaseClient<Database>,
  user: User,
  formData: ImapSmtpFormData
): Promise<ImapFormState> {

  // 1. Validació Zod
  const validation = ImapSmtpSchema.safeParse(formData);
  if (!validation.success) {
    return { success: false, message: "Dades del formulari invàlides.", errors: validation.error.flatten().fieldErrors };
  }
  const { email, password, imapHost, imapPort, smtpHost, smtpPort } = validation.data;

  // 2. Lògica de Verificació
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
  
  // 3. Lògica de Criptografia i Emmagatzematge
  try {
    const secretKey = process.env.ENCRYPTION_SECRET_KEY;
    if (!secretKey) {
      throw new Error("La clau d'encriptació no està configurada al servidor.");
    }

    const encryptedPassword = AES.encrypt(password, secretKey).toString();
    
    // Guardem només la configuració, no la contrasenya en text pla
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
    
    return { success: true, message: "Compte de correu connectat correctament!" };

  } catch (error) {
    console.error("Error en connectImapSmtp (service):", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message: `Error en el procés de connexió: ${errorMessage}` };
  }
}

/**
 * SERVEI: Desconnecta una integració per a l'usuari o equip.
 */
export async function disconnectIntegration(
  supabase: SupabaseClient<Database>,
  user: User,
  activeTeamId: string,
  provider: string
): Promise<DisconnectFormState> {
  try {
    const isTeamIntegration = ['linkedin', 'facebook', 'instagram'].includes(provider);
    let query;

    if (isTeamIntegration) {
      query = supabase.from('team_credentials').delete().match({ team_id: activeTeamId, provider });
    } else {
      query = supabase.from('user_credentials').delete().match({ user_id: user.id, provider });
    }

    const { error } = await query;
    if (error) throw error;

    return { success: true, message: `Integració desconnectada correctament.` };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message: `No s'ha pogut desconnectar: ${errorMessage}` };
  }
}