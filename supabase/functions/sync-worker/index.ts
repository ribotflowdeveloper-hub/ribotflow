import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function decodeBase64Url(base64Url: string): string {
  const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  const decoded = atob(base64);
  return decodeURIComponent(
    Array.prototype.map.call(decoded, (c: string) =>
      "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
    ).join("")
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    if (!userId) throw new Error("Falta el paràmetre 'userId'.");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: creds, error: userError } = await supabaseAdmin
      .from("user_credentials")
      .select("refresh_token")
      .eq("user_id", userId)
      .single();

    if (userError || !creds) throw new Error(`No s'han trobat credencials per a l'usuari ${userId}`);

    const { data: blacklistRules } = await supabaseAdmin
        .from('blacklist_rules')
        .select('value')
        .eq('user_id', userId);
      
    const userBlacklist = (blacklistRules || []).map(r => r.value);

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: Deno.env.get("GOOGLE_CLIENT_ID"),
          client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET"),
          refresh_token: creds.refresh_token,
          grant_type: "refresh_token",
        }),
    });

    const tokens = await tokenRes.json();
    const accessToken = tokens.access_token;
    if (!accessToken) throw new Error(`No s'ha pogut obtenir l'access token per a l'usuari ${userId}`);

    const { data: lastEmail } = await supabaseAdmin
        .from("tickets")
        .select("sent_at")
        .eq("user_id", userId)
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    let gmailQuery = "-in:draft";
    if (lastEmail?.sent_at) {
      const lastSync = Math.floor(new Date(lastEmail.sent_at).getTime() / 1000);
      gmailQuery += ` after:${lastSync}`;
    }

    let allMessages = [];
    let nextPageToken = undefined;
    const MAX_PAGES = 5; // Limitem a 5 pàgines (500 emails) per execució per evitar timeouts
    let currentPage = 0;

    do {
      let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=100&q=${encodeURIComponent(gmailQuery)}`;
      if (nextPageToken) {
        url += `&pageToken=${nextPageToken}`;
      }
      
      const messagesRes = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      const messagesData = await messagesRes.json();
      
      if (messagesData.messages) {
        allMessages.push(...messagesData.messages);
      }
      
      nextPageToken = messagesData.nextPageToken;
      currentPage++;
    } while (nextPageToken && currentPage < MAX_PAGES);

    console.log(`[SYNC] Missatges trobats per a ${userId}: ${allMessages.length}`);
    let processedCount = 0;

    for (const msg of allMessages) {
      try {
        if (!msg.id) continue;

        const { data: exists } = await supabaseAdmin
          .from("tickets")
          .select("id")
          .eq("user_id", userId)
          .eq("gmail_message_id", msg.id)
          .maybeSingle();

        if (exists) {
          continue;
        }

        const emailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!emailRes.ok) {
          console.error(`[ERROR Gmail] No puc llegir ${msg.id}:`, await emailRes.text());
          continue;
        }

        const emailData = await emailRes.json();
        const payload = emailData.payload;

        const getHeader = (name: string) =>
          payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

        const subject = getHeader("Subject") || "(Sense assumpte)";
        const fromHeader = getHeader("From");
        const fromEmail = (fromHeader.match(/<(.+)>/)?.[1] || fromHeader).toLowerCase();
        const fromName = fromHeader.includes("<")
          ? fromHeader.split("<")[0].trim().replace(/"/g, "")
          : fromEmail;
        const sentAt = getHeader("Date")
          ? new Date(getHeader("Date")).toISOString()
          : new Date().toISOString();

        const fromDomain = fromEmail.split('@')[1];
        if (userBlacklist.some(item => fromEmail.includes(item) || fromDomain?.includes(item))) {
            console.log(`[BLACKLIST] Ignorant email de ${fromEmail}`);
            continue;
        }

        const isUnread = emailData.labelIds?.includes("UNREAD");
        const isSent = emailData.labelIds?.includes("SENT");
        const ticketStatus = isUnread ? "Obert" : "Llegit";
        const ticketType = isSent ? "enviat" : "rebut";

        let body = "";
        const findPart = (parts: any[], mimeType: string): string | null => {
          for (const part of parts) {
            if (part.mimeType === mimeType && part.body?.data) return part.body.data;
            if (part.parts) {
              const found = findPart(part.parts, mimeType);
              if (found) return found;
            }
          }
          return null;
        };

        if (payload?.parts) {
          const html = findPart(payload.parts, "text/html");
          const text = findPart(payload.parts, "text/plain");
          body = html ? decodeBase64Url(html) : text ? decodeBase64Url(text) : "";
        } else if (payload?.body?.data) {
          body = decodeBase64Url(payload.body.data);
        }

        const preview = body
          ? body.replace(/<style[^>]*>.*<\/style>/gs, "").replace(/<[^>]*>?/gm, " ").replace(/(\r\n|\n|\r|&nbsp;)/gm, " ").replace(/\s+/g, " ").trim().substring(0, 150)
          : emailData.snippet || "";

        const { data: contact } = await supabaseAdmin.from('contacts').select('id').eq('user_id', userId).eq('email', fromEmail).single();
        let contactId = contact?.id;

        const { error: insertError } = await supabaseAdmin.from("tickets").insert({
            user_id: userId,
            contact_id: contactId,
            subject,
            body: body || emailData.snippet || "",
            status: ticketStatus,
            gmail_message_id: msg.id,
            type: ticketType,
            preview,
            sent_at: sentAt,
            sender_name: fromName,
            sender_email: fromEmail,
        });

        if (insertError) {
          console.error(`[ERROR INSERT] ${msg.id}:`, insertError);
        } else {
          console.log(`[INSERT] Ticket creat per ${msg.id}`);
          processedCount++;
        }
      } catch (err) {
        console.error(`[Worker] Error processant el missatge ${msg.id}:`, err);
      }
    }

    return new Response(JSON.stringify({ message: `Sincronització completada per a ${userId}. ${processedCount} emails processats.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    console.error(`[Worker Error General] per a ${req.json().userId}:`, err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
