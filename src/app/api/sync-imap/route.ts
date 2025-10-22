// src/app/api/sync-imap/route.ts

import { NextResponse } from 'next/server';
import imaps from 'imap-simple'; // Només importem el valor per defecte
// Eliminem: import type { ImapSimple } from 'imap-simple';
import { simpleParser, ParsedMail } from 'mailparser';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';
import { Buffer } from 'buffer'; // Importem Buffer explícitament per claredat

// ✅ CORRECCIÓ PRINCIPAL: Derivar el tipus de la connexió
// Obtenim el tipus del valor que retorna la promesa de 'imaps.connect'
type ImapConnection = Awaited<ReturnType<typeof imaps.connect>>;

// --- La resta de les interfícies es mantenen igual ---
interface NormalizedEmail {
  provider_message_id: string;
  subject: string;
  body: string;
  preview: string;
  sent_at: string; // ISO String
  sender_name: string;
  sender_email: string;
  status: 'Llegit' | 'NoLlegit';
  type: 'rebut' | 'enviat';
}

interface ImapPart {
  which: string;
  body: string;
}

interface ImapMessage {
  attributes: {
    uid: number;
  };
  parts: ImapPart[];
}

/**
 * Funció auxiliar per trobar el nom real de la bústia d'enviats.
 */
// Utilitzem el nou tipus ImapConnection
async function getSentBoxName(connection: ImapConnection): Promise<string> {
  // Ara TypeScript hauria de conèixer els mètodes de 'connection'
  const boxes = await connection.getBoxes();

  const commonNames = ['Sent', 'Sent Items', 'Enviats', '[Gmail]/Sent Mail'];

  for (const name of commonNames) {
    if (boxes[name]) {
      return name;
    }
  }

  for (const boxName in boxes) {
    // Afegim una comprovació extra per a hasOwnProperty
    if (Object.prototype.hasOwnProperty.call(boxes, boxName) && boxes[boxName] && boxes[boxName].attribs.includes('\\Sent')) {
      return boxName;
    }
  }

  return 'Sent';
}

/**
 * Funció principal per obtenir i processar correus d'una bústia
 */
async function fetchEmailsFromMailbox(
  connection: ImapConnection, // <-- Utilitzem el nou tipus
  boxName: string,
  type: 'rebut' | 'enviat',
  lastSyncDate: string | null
): Promise<NormalizedEmail[]> {

  try {
    await connection.openBox(boxName); // <-- TypeScript hauria de reconèixer 'openBox'
    console.log(`[API-IMAP-FETCH] Bústia '${boxName}' oberta correctament.`);

    const searchCriteria: (string | [string, Date])[] = ['ALL'];

    let sinceDate: Date;
    if (lastSyncDate) {
      sinceDate = new Date(lastSyncDate);
    } else {
      sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - 7);
    }
    searchCriteria.push(['SINCE', sinceDate]);

    const messages: ImapMessage[] = await connection.search(searchCriteria, { // <-- TypeScript hauria de reconèixer 'search'
      bodies: ['HEADER', 'TEXT'],
    });

    if (messages.length === 0) {
      console.log(`[API-IMAP-FETCH] No s'han trobat missatges nous a '${boxName}'.`);
      return [];
    }

    console.log(`[API-IMAP-FETCH] S'han trobat ${messages.length} missatges a '${boxName}'. Processant...`);

    const emailPromises = messages.map(async (item) => {
      try {
        const headerPart = item.parts.find((part) => part.which === 'HEADER');
        const textPart = item.parts.find((part) => part.which === 'TEXT');
        const id = item.attributes.uid;

        if (!headerPart?.body || !textPart?.body) {
          console.warn(`[API-IMAP-PARSE] Missatge ${id} a '${boxName}' descartat per falta de HEADER o TEXT.`);
          return null;
        }

        const rawEmail = `${headerPart.body}\r\n${textPart.body}`;
        const parsed: ParsedMail = await simpleParser(rawEmail);

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

        const from = parsed.from?.value[0];
        const senderName = from?.name || 'Desconegut';
        const senderEmail = (from?.address || 'unknown@domain.com').toLowerCase();

        return {
          provider_message_id: id.toString(),
          subject: parsed.subject || '(Sense assumpte)',
          body: body,
          preview: (parsed.text || body.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ")).trim().substring(0, 150),
          sent_at: parsed.date?.toISOString() || new Date().toISOString(),
          sender_name: senderName,
          sender_email: senderEmail,
          status: 'NoLlegit',
          type: type,
        };
      } catch (parseError: unknown) {
        console.error(`[API-IMAP-PARSE] Error parsejant el missatge ${item.attributes.uid}:`, (parseError as Error).message);
        return null;
      }
    });

    const emails = await Promise.all(emailPromises);
    return emails.filter((email): email is NormalizedEmail => email !== null);

  } catch (err: unknown) {
    const message = typeof err === 'object' && err !== null && 'message' in err ? (err as { message: string }).message : String(err);
    console.warn(`[API SYNC-IMAP] No s'ha pogut obrir o llegir la carpeta '${boxName}'. Missatge:`, message);
    return [];
  }
}

export async function POST(request: Request) {
  console.log('[API-IMAP-INICI] Petició rebuda.');
  let connection: ImapConnection | undefined; // <-- Utilitzem el nou tipus

  try {
    // ... (la resta de la lògica de validació i connexió es manté igual)
    const functionsSecret = process.env.FUNCTIONS_SECRET;
    const authHeader = request.headers.get('Authorization');
    if (!functionsSecret || authHeader !== `Bearer ${functionsSecret}`) {
      console.error('[API-IMAP-ERROR] Autorització fallida.');
      return NextResponse.json({ error: "No autoritzat." }, { status: 401 });
    }

    const body = await request.json();
    const { config, encryptedPassword, lastSyncDate } = body;
    if (!config || !encryptedPassword) {
      return NextResponse.json({ error: "Falten credencials." }, { status: 400 });
    }

    const secretKey = process.env.ENCRYPTION_SECRET_KEY;
    if (!secretKey) {
      console.error("[API-IMAP-ERROR] ENCRYPTION_SECRET_KEY no configurada.");
      return NextResponse.json({ error: "Error de configuració." }, { status: 500 });
    }

    const decryptedPassword = AES.decrypt(encryptedPassword, secretKey).toString(Utf8);
    if (!decryptedPassword) {
      return NextResponse.json({ error: "No s'ha pogut desencriptar." }, { status: 500 });
    }

    const imapConfig = {
      imap: {
        user: config.imap.user,
        password: decryptedPassword,
        host: config.imap.host,
        port: config.imap.port,
        tls: true,
        authTimeout: 10000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    console.log(`[API-IMAP-CONN] Intentant connectar a ${config.imap.host} per a l'usuari ${config.imap.user}`);
    connection = await imaps.connect(imapConfig);
    console.log(`[API-IMAP-CONN] Connexió amb ${config.imap.host} establerta.`);

    const sentBoxName = await getSentBoxName(connection);
    console.log(`[API-IMAP-FETCH] Bústia d'enviats detectada: '${sentBoxName}'`);

    const [inboxEmails, sentEmails] = await Promise.all([
      fetchEmailsFromMailbox(connection, 'INBOX', 'rebut', lastSyncDate),
      fetchEmailsFromMailbox(connection, sentBoxName, 'enviat', lastSyncDate)
    ]);

    console.log(`[API-IMAP-COMPLET] S'han trobat ${inboxEmails.length} a INBOX i ${sentEmails.length} a ${sentBoxName}.`);

    await connection.end(); // <-- TypeScript hauria de reconèixer 'end'
    connection = undefined;

    return NextResponse.json([...inboxEmails, ...sentEmails]);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Error desconegut a l'API de sync-imap";
    console.error("[API SYNC-IMAP ERROR GENERAL]:", errorMessage);

    if (connection) {
      try {
        await connection.end(); // <-- TypeScript hauria de reconèixer 'end'
      } catch (closeErr: unknown) {
        console.error("Error al tancar la connexió després d'un error:", (closeErr as Error).message);
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}