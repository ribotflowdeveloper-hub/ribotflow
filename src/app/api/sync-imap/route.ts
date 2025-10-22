// src/app/api/sync-imap/route.ts

import { NextResponse } from 'next/server';
// ✅ Importem tipus addicionals de imapflow
import { ImapFlow, FetchMessageObject } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import { Buffer } from 'buffer';

// --- Interfícies ---
interface NormalizedEmail { provider_message_id: string; subject: string; body: string; preview: string; sent_at: string; sender_name: string; sender_email: string; status: 'Llegit' | 'NoLlegit'; type: 'rebut' | 'enviat'; }

// ✅ Simplifiquem ImapSearchCriteria (ja no necessitem unir amb el tipus inexistent)
// Aquest tipus descriu l'objecte que estem construint
type ImapSearchCriteria = {
  all: boolean;
  since?: Date;
  // Podríem afegir altres propietats si les féssim servir (ex: 'seen', 'from', etc.)
};


// Funció auxiliar per trobar el nom real de la bústia d'enviats amb imapflow
async function getSentBoxNameFlow(client: ImapFlow): Promise<string> {
  console.log('[API-IMAP-DEBUG] getSentBoxNameFlow: Cridant a client.list().');
  try {
    const mailboxes = await client.list();
    console.log('[API-IMAP-DEBUG] getSentBoxNameFlow: Bústies obtingudes.');

    const commonNames = ['Sent', 'Sent Items', 'Enviats', '[Gmail]/Sent Mail'];

    for (const name of commonNames) {
      const found = mailboxes.find(box => box.name.toUpperCase() === name.toUpperCase());
      if (found) {
        console.log(`[API-IMAP-DEBUG] getSentBoxNameFlow: Trobada bústia comuna: ${found.path}`);
        return found.path;
      }
    }

    const sentBox = mailboxes.find(box => box.specialUse === '\\Sent');
    if (sentBox) {
      console.log(`[API-IMAP-DEBUG] getSentBoxNameFlow: Trobada bústia amb flag \\Sent: ${sentBox.path}`);
      return sentBox.path;
    }

  } catch (listError: unknown) {
    console.error(`[API-IMAP-ERROR] getSentBoxNameFlow: Error obtenint llista de bústies: ${(listError as Error).message}`);
  }

  console.warn('[API-IMAP-WARN] getSentBoxNameFlow: No s\'ha trobat cap bústia d\'enviats específica. Utilitzant "Sent" per defecte.');
  return 'Sent';
}


// Funció principal per obtenir i processar correus amb imapflow
async function fetchEmailsFromMailboxFlow(
  client: ImapFlow,
  boxName: string,
  type: 'rebut' | 'enviat',
  lastSyncDate: string | null
): Promise<NormalizedEmail[]> {

  let lock;
  try {
    console.log(`[API-IMAP-FETCH] Intentant obrir bústia '${boxName}'...`);
    lock = await client.getMailboxLock(boxName);
    console.log(`[API-IMAP-FETCH] Bústia '${boxName}' oberta i bloquejada.`);

    // ✅ Utilitzem el tipus ImapSearchCriteria
    const searchCriteria: ImapSearchCriteria = { all: true };
    if (lastSyncDate) {
        searchCriteria.since = new Date(lastSyncDate);
    } else {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        searchCriteria.since = sevenDaysAgo;
    }

    console.log(`[API-IMAP-FETCH] Criteris de cerca per a '${boxName}':`, searchCriteria);

    const messages: NormalizedEmail[] = [];
    // ✅ Definim un tipus per a msg que inclogui les propietats que demanem
    // Potser cal ajustar-lo si els tipus de FetchMessageObject no són exactes
    interface FetchedMsg extends FetchMessageObject {
        bodyPeek?: Buffer; // Marcat com opcional per si de cas
        // envelope ja està definit a FetchMessageObject si es demana
    }

    // Usem fetch() per obtenir missatges
    for await (const msg of client.fetch(searchCriteria, { uid: true, envelope: true, source: true }) as AsyncGenerator<FetchedMsg>) { // Asseveració de tipus aquí
      try {
        console.log(`[API-IMAP-FETCH] Processant missatge UID ${msg.uid} de '${boxName}'`);

        // ✅ Accedim a msg.bodyPeek (ara hauria d'existir gràcies a l'asseveració)
        if (!msg.bodyPeek) {
          console.warn(`[API-IMAP-PARSE] Missatge ${msg.uid} a '${boxName}' descartat per falta de bodyPeek.`);
          continue;
        }

        const parsed: ParsedMail = await simpleParser(msg.bodyPeek);

        let body = parsed.html || parsed.textAsHtml || parsed.text || '';
        if (parsed.attachments) {
          for (const attachment of parsed.attachments) {
            if (attachment.cid && attachment.content) {
              const contentBuffer = Buffer.isBuffer(attachment.content)
                ? attachment.content
                : Buffer.from(attachment.content);
              const dataUri = `data:${attachment.contentType};base64,${contentBuffer.toString('base64')}`;
              const cidRegex = new RegExp(`cid:${attachment.cid}`, "g");
              body = body.replace(cidRegex, dataUri);
            }
          }
        }

        const fromHeader = parsed.from?.value[0]; // Preferim el 'From' parsejat si existeix
        const envelopeFrom = msg.envelope?.from?.[0]; // Obtenim l'envelope de 'msg'

        // ✅ Corregim l'ús de msg.envelope per a senderName i senderEmail
        const senderName = fromHeader?.name || envelopeFrom?.name || 'Desconegut';
        const senderEmail = (fromHeader?.address || envelopeFrom?.address || 'unknown@domain.com').toLowerCase();

        messages.push({
          provider_message_id: msg.uid.toString(),
           // ✅ Corregim l'ús de msg.envelope per a subject i sent_at
          subject: parsed.subject || msg.envelope?.subject || '(Sense assumpte)',
          body: body,
          preview: (parsed.text || body.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ")).trim().substring(0, 150),
          sent_at: (msg.envelope?.date || parsed.date || new Date()).toISOString(),
          sender_name: senderName,
          sender_email: senderEmail,
          status: 'NoLlegit',
          type: type,
        });
      } catch (parseError: unknown) {
        console.error(`[API-IMAP-PARSE] Error parsejant el missatge UID ${msg.uid} a ${boxName}:`, (parseError as Error).message);
      }
    }

    console.log(`[API-IMAP-FETCH] Processats ${messages.length} missatges de '${boxName}'.`);
    return messages;

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[API SYNC-IMAP] Error a fetchEmailsFromMailboxFlow per a '${boxName}'. Missatge:`, message);
    if (message.toLowerCase().includes('mailbox does not exist') || message.toLowerCase().includes('no such mailbox')) {
         console.log(`[API-IMAP-FETCH] La bústia '${boxName}' no existeix. Saltant...`);
         return [];
    }
    throw err;
  } finally {
    if (lock) {
      await lock.release();
      console.log(`[API-IMAP-FETCH] Bloqueig de la bústia '${boxName}' alliberat.`);
    }
  }
}

// Handler POST principal (sense canvis necessaris aquí per aquests errors)
export async function POST(request: Request) {
  console.log('[API-IMAP-INICI] Petició rebuda.');
  let client: ImapFlow | null = null;
  try {
    const functionsSecret = process.env.FUNCTIONS_SECRET;
    const authHeader = request.headers.get('Authorization');
    if (!functionsSecret || authHeader !== `Bearer ${functionsSecret}`) {
      console.error('[API-IMAP-ERROR] Autorització fallida.');
      return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
    }
    const body = await request.json();
    const { config, encryptedPassword, lastSyncDate } = body;
    if (!config || !config.imap || !encryptedPassword) {
      return NextResponse.json({ error: "Falten credencials o configuració imap." }, { status: 400 });
    }
    const secretKey = process.env.ENCRYPTION_SECRET_KEY;
    if (!secretKey) {
      console.error("[API-IMAP-ERROR] ENCRYPTION_SECRET_KEY no configurada.");
      return NextResponse.json({ error: "Error de configuració del servidor." }, { status: 500 });
    }
    const decryptedPassword = AES.decrypt(encryptedPassword, secretKey).toString(Utf8);
    if (!decryptedPassword) {
      return NextResponse.json({ error: "No s'ha pogut desencriptar la contrasenya." }, { status: 500 });
    }

    client = new ImapFlow({ /* ...configuració... */
        host: config.imap.host,
        port: config.imap.port,
        secure: config.imap.tls ?? true,
        auth: { user: config.imap.user, pass: decryptedPassword },
        logger: false,
        tls: { rejectUnauthorized: false },
        socketTimeout: 60000,
        connectionTimeout: 15000
    });

    console.log(`[API-IMAP-CONN] Intentant connectar (imapflow) a ${config.imap.host} per a l'usuari ${config.imap.user}`);
    await client.connect();
    console.log(`[API-IMAP-CONN] Connexió (imapflow) amb ${config.imap.host} establerta.`);

    const sentBoxName = await getSentBoxNameFlow(client);
    console.log(`[API-IMAP-FETCH] Bústia d'enviats detectada/assignada: '${sentBoxName}'`);

    console.log('[API-IMAP-FETCH] Obtenint correus de INBOX...');
    const inboxEmails = await fetchEmailsFromMailboxFlow(client, 'INBOX', 'rebut', lastSyncDate);
    console.log(`[API-IMAP-FETCH] Obtinguts ${inboxEmails.length} correus de INBOX.`);

    console.log(`[API-IMAP-FETCH] Obtenint correus de ${sentBoxName}...`);
    const sentEmails = await fetchEmailsFromMailboxFlow(client, sentBoxName, 'enviat', lastSyncDate);
    console.log(`[API-IMAP-FETCH] Obtinguts ${sentEmails.length} correus de ${sentBoxName}.`);

    console.log(`[API-IMAP-COMPLET] S'han trobat ${inboxEmails.length} a INBOX i ${sentEmails.length} a ${sentBoxName}.`);

    await client.logout();
    console.log('[API-IMAP-CONN] Desconnectat (logout) del servidor IMAP.');
    client = null;

    return NextResponse.json([...inboxEmails, ...sentEmails]);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconegut a l'API de sync-imap";
    console.error("[API SYNC-IMAP ERROR GENERAL]:", errorMessage);
    console.error("[API SYNC-IMAP ERROR OBJECT]:", error);

    if (client && client.usable) {
      try {
        console.log('[API-IMAP-CLEANUP] Intentant logout després d\'error...');
        await client.logout();
        console.log('[API-IMAP-CLEANUP] Logout amb èxit després d\'error.');
      } catch (logoutErr: unknown) {
        console.error("[API-IMAP-CLEANUP] Error durant el logout després d'un error:", (logoutErr as Error).message);
      }
    }
    client = null;

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}