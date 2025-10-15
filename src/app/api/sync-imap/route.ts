import { NextResponse } from 'next/server';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import AES from 'crypto-js/aes';
import Utf8 from 'crypto-js/enc-utf8';

interface NormalizedEmail {
  provider_message_id: string;
  subject: string;
  body: string;
  preview: string;
  sent_at: string;
  sender_name: string;
  sender_email: string;
  status: 'NoLlegit' | 'Llegit';
  type: 'rebut' | 'enviat';
}

interface ImapPart {
  which: string;
  body?: string;
}

export async function POST(request: Request) {
  // ✅ LOG A: Punt d'entrada de l'API Route
  console.log('[API-IMAP-INICI] Petició rebuda.');
  try {
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
        authTimeout: 5000,
        tlsOptions: { rejectUnauthorized: false }
      }
    };

    // ✅ LOG B: Abans de connectar
    console.log(`[API-IMAP-CONN] Intentant connectar a ${config.imap.host} per a l'usuari ${config.imap.user}`);
    const connection = await imaps.connect(imapConfig);
    // ✅ LOG C: Després de connectar
    console.log(`[API-IMAP-CONN] Connexió amb ${config.imap.host} establerta.`);
    
    const fetchEmailsFromMailbox = async (boxName: string, type: 'rebut' | 'enviat'): Promise<NormalizedEmail[]> => {
      try {
        await connection.openBox(boxName);
        const searchCriteria: (string | [string, Date])[] = ['ALL'];
        if (lastSyncDate) {
          searchCriteria.push(['SINCE', new Date(lastSyncDate)]);
        }

        const messages = await connection.search(searchCriteria, { bodies: [''] });
        const emails: NormalizedEmail[] = [];

        for (const item of messages) {
          const bodyPart = item.parts.find((part: ImapPart) => part.which === '');
          const id = item.attributes.uid;

          if (bodyPart?.body) {
            const parsed = await simpleParser(bodyPart.body);
            emails.push({
              provider_message_id: id.toString(),
              subject: parsed.subject || '(Sense assumpte)',
              body: parsed.html || parsed.textAsHtml || '',
              preview: (parsed.text || '').substring(0, 150),
              sent_at: parsed.date?.toISOString() || new Date().toISOString(),
              sender_name: parsed.from?.value[0]?.name || 'Desconegut',
              sender_email: (parsed.from?.value[0]?.address || '').toLowerCase(),
              status: 'NoLlegit',
              type: type,
            });
          }
        }
        return emails;
      } catch (err: unknown) {
        const message = typeof err === 'object' && err !== null && 'message' in err ? (err as { message: string }).message : String(err);
        console.warn(`[API SYNC-IMAP] No s'ha pogut obrir la carpeta '${boxName}'. Missatge:`, message);
        return [];
      }
    }

    const inboxEmails = await fetchEmailsFromMailbox('INBOX', 'rebut');
    const sentEmails = await fetchEmailsFromMailbox('Sent', 'enviat');
    console.log(`[API-IMAP-FETCH] S'han trobat ${inboxEmails.length} a INBOX i ${sentEmails.length} a Sent.`);

    await connection.end();

    return NextResponse.json([...inboxEmails, ...sentEmails]);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Error desconegut a l'API de sync-imap";
    console.error("[API SYNC-IMAP ERROR]:", errorMessage);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}