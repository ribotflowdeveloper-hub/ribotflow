// supabase/functions/processar-factura/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://esm.sh/openai@4.40.1';
import { corsHeaders } from '../_shared/cors.ts';

// Tipus per a les dades extretes (bona pràctica)
interface ExtractedExpenseData {
  supplier_name: string | null;
  invoice_number: string | null;
  invoice_date: string | null; // Format YYYY-MM-DD
  total_amount: number | null;
  tax_amount: number | null;
  currency: string | null;
}

// Inicialitza el client d'OpenAI
const openai = new OpenAI({
  apiKey: Deno.env.get('OPENAI_API_KEY'),
});

// Funció auxiliar per crear l'esborrany de despesa
async function createDraftExpense(
  supabaseAdmin: import('@supabase/supabase-js').SupabaseClient,
  data: ExtractedExpenseData,
  teamId: string,
  userId: string,
  filePath: string,
  fileName: string,
) {
  // 1. Cercar o crear proveïdor
  let supplierId = null;
  if (data.supplier_name) {
    // Intentem trobar un proveïdor existent amb un nom similar
    const { data: existingSupplier, error: findError } = await supabaseAdmin
      .from('suppliers')
      .select('id')
      .eq('team_id', teamId)
      .ilike('name', `%${data.supplier_name}%`)
      .maybeSingle();

    if (findError) {
      console.warn('Error buscant proveïdor:', findError.message);
    }

    if (existingSupplier) {
      supplierId = existingSupplier.id;
    } else {
      // Si no existeix, el creem
      const { data: newSupplier, error: createError } = await supabaseAdmin
        .from('suppliers')
        .insert({
          name: data.supplier_name,
          team_id: teamId,
        })
        .select('id')
        .single();
      
      if (createError) {
        console.warn('Error creant proveïdor:', createError.message);
      } else if (newSupplier) {
        supplierId = newSupplier.id;
      }
    }
  }

  // 2. Inserir la despesa (esborrany)
  const { data: newExpense, error: expenseError } = await supabaseAdmin
    .from('expenses')
    .insert({
      team_id: teamId,
      user_id: userId,
      supplier_id: supplierId,
      expense_date: data.invoice_date || new Date().toISOString().split('T')[0],
      total_amount: data.total_amount || 0,
      tax_amount: data.tax_amount || 0,
      status: 'pending', // -> ESTAT ESBORRANY
      description: `Factura ${data.invoice_number || 'sense número'} de ${data.supplier_name || 'proveïdor desconegut'}`,
      currency: (data.currency || 'EUR').toUpperCase(),
    })
    .select('id')
    .single();

  if (expenseError) {
    console.error('Error greu creant despesa:', expenseError);
    throw new Error(`Error creant despesa: ${expenseError.message}`);
  }

  if (!newExpense) {
    throw new Error('No s\'ha pogut crear la despesa.');
  }

  // 3. Enllaçar l'adjunt a la nova despesa
  const { error: attachmentError } = await supabaseAdmin
    .from('expense_attachments')
    .insert({
      expense_id: newExpense.id,
      file_path: filePath,
      file_name: fileName,
      team_id: teamId,
      uploaded_by: userId,
    });

  if (attachmentError) {
    // Això no és tan greu com per revertir-ho, només ho registrem
    console.error('Error enllaçant adjunt:', attachmentError.message);
  }

  return { expenseId: newExpense.id };
}

// Handler principal de l'Edge Function
Deno.serve(async (req: Request) => {
  // Gestionar la petició OPTIONS (preflight) per a CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { filePath, teamId, userId, fileName } = await req.json();

    if (!filePath || !teamId || !userId || !fileName) {
      return new Response(JSON.stringify({ error: 'Paràmetres invàlids: filePath, teamId, userId i fileName són requerits' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Crear un client Supabase (amb rol 'service_role') per a operacions d'admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // 1. Descarregar el fitxer de Storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from('expense-uploads') // Assegura't que el bucket existeix
      .download(filePath);

    if (downloadError) {
      throw new Error(`Error descarregant fitxer: ${downloadError.message}`);
    }

    // 2. Convertir el Blob a Base64 per enviar a OpenAI
    const fileBuffer = await fileData.arrayBuffer();
    const fileBase64 = btoa(
      new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    );
    const mimeType = fileData.type;

    // 3. Crida a GPT-4o (Vision)
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `
                Analitza aquesta factura (PDF/PNG) i extreu les següents dades.
                Retorna ÚNICAMENT un objecte JSON vàlid.
                Els camps són: 
                - supplier_name: Nom del proveïdor (string)
                - invoice_number: Número de factura (string)
                - invoice_date: Data d'emissió (string, format YYYY-MM-DD)
                - total_amount: Import total (number)
                - tax_amount: Import d'impostos (number)
                - currency: Moneda (string, codi ISO 3 lletres, ex: "EUR")
                
                Si una dada no es pot extreure, posa 'null'.
                El format de la data ha de ser estrictament YYYY-MM-DD.
                El nom del proveïdor ha de ser el nom legal o comercial, no una persona de contacte.
              `,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${fileBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('Resposta buida d\'OpenAI');
    }

    const extractedData: ExtractedExpenseData = JSON.parse(content);

    // 4. Crear l'esborrany a la base de dades
    const { expenseId } = await createDraftExpense(
      supabaseAdmin,
      extractedData,
      teamId,
      userId,
      filePath,
      fileName
    );

    // Retornar èxit
    return new Response(JSON.stringify({ success: true, expenseId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error a processar-factura:', error);
    const errorMessage = typeof error === 'object' && error !== null && 'message' in error
      ? (error as { message: string }).message
      : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});