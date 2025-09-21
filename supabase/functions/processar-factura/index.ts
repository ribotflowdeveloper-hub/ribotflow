import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

// Variables d'entorn per a la connexió amb l'API de Mindee.
const MINDEE_API_KEY = Deno.env.get('MINDEE_API_KEY');
const MINDEE_API_URL = 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

/**
 * Aquesta Edge Function processa un arxiu de factura (PDF o imatge) utilitzant
 * un servei d'OCR (Reconeixement Òptic de Caràcters) anomenat Mindee.
 * Extreu les dades clau de la factura (proveïdor, dates, imports, conceptes)
 * i les retorna en un format JSON estructurat.
 */
serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

try {
    // Aquesta funció utilitza la 'SERVICE_ROLE_KEY' per actuar com a administrador,
    // ja que necessita buscar i potencialment crear contactes/proveïdors a la base de dades.
    const supabaseAdmin = createClient();
    
    // Verifiquem l'usuari que fa la petició a través del seu token JWT.
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''));
    if (!user) throw new Error("Usuari no autenticat.");
    if (!MINDEE_API_KEY) throw new Error("La clau API de Mindee no està configurada.");

    // El client envia l'arxiu com a 'FormData'.
    const formData = await req.formData();
    const file = formData.get('document');
    if (!file) throw new Error("No s'ha proporcionat cap arxiu al camp 'document'.");

    // Enviem l'arxiu directament a l'API de Mindee per al seu processament.
    const mindeeResponse = await fetch(MINDEE_API_URL, { method: 'POST', headers: { 'Authorization': `Token ${MINDEE_API_KEY}` }, body: formData });
    if (!mindeeResponse.ok) throw new Error(`Error de Mindee: ${JSON.stringify(await mindeeResponse.json())}`);
    
    const result = await mindeeResponse.json();
    const prediction = result.document.inference.prediction; // Les dades extretes per la IA.

    let contactId = null;
    let supplierId = null;
    const customerName = prediction.customer_name?.value;
    const supplierName = prediction.supplier_name?.value;
// Lògica per buscar si el client extret ja existeix com a contacte.
    // Si no existeix, el crea. Això enriqueix automàticament el CRM.
    if (customerName) {
      const { data: foundContact } = await supabaseAdmin.from('contacts').select('id').eq('user_id', user.id).ilike('nom', `%${customerName}%`).limit(1).single();
      if (foundContact) contactId = foundContact.id;
      else {
        const { data: newContact } = await supabaseAdmin.from('contacts').insert({ user_id: user.id, nom: customerName, estat: 'Client' }).select('id').single();
        if (newContact) contactId = newContact.id;
      }
    }
    // Lògica similar per al proveïdor.
    if (supplierName) {
        const { data: foundSupplier } = await supabaseAdmin.from('suppliers').select('id').eq('user_id', user.id).ilike('nom', `%${supplierName}%`).limit(1).single();
        if (foundSupplier) {
            supplierId = foundSupplier.id;
        } else {
            const { data: newSupplier } = await supabaseAdmin.from('suppliers').insert({ user_id: user.id, nom: supplierName }).select('id').single();
            if (newSupplier) supplierId = newSupplier.id;
        }
    }
    // Mapegem els conceptes (línies de la factura) extrets per Mindee al nostre format de dades.
    
    const lineItems = (prediction.line_items || []).map(item => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
    }));
    // Lògica per calcular el descompte si Mindee no el proporciona explícitament.

    const lineItemsSubtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const mindeeSubtotal = prediction.total_net?.value || lineItemsSubtotal;
    const discountAmount = parseFloat((lineItemsSubtotal - mindeeSubtotal).toFixed(2));
// Construïm l'objecte final amb totes les dades extretes i processades.
    const extractedData = {
      contact_id: contactId,
      supplier_id: supplierId,
      invoice_number: prediction.invoice_number?.value || null,
      issue_date: prediction.date?.value || null,
      due_date: prediction.due_date?.value || null,
      description: supplierName ? `Compra a ${supplierName}` : null,
      notes: prediction.supplier_name?.value ? `Factura de: ${prediction.supplier_name.value}` : '',
      subtotal: prediction.total_net?.value || 0,
      tax_amount: prediction.total_tax?.value || 0,
      total_amount: prediction.total_amount?.value || 0,
      discount_amount: discountAmount > 0 ? discountAmount : null,
      expense_items: lineItems.length > 0 ? lineItems : [{ description: '', quantity: 1, unit_price: 0 }],
    };
     // Retornem les dades extretes al client perquè pugui pre-omplir el formulari de despeses.
    return new Response(JSON.stringify(extractedData), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error('[ERROR PROCESSAR-FACTURA]', error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});