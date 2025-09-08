import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const MINDEE_API_KEY = Deno.env.get('MINDEE_API_KEY');
const MINDEE_API_URL = 'https://api.mindee.net/v1/products/mindee/invoices/v4/predict';
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

serve(async (req) => {
  if (req.method === 'OPTIONS') { return new Response('ok', { headers: corsHeaders }); }

  try {
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: { user } } = await supabaseAdmin.auth.getUser(req.headers.get('Authorization')!.replace('Bearer ', ''));
    if (!user) throw new Error("Usuari no autenticat.");
    if (!MINDEE_API_KEY) throw new Error("La clau API de Mindee no està configurada.");

    const formData = await req.formData();
    const file = formData.get('document');
    if (!file) throw new Error("No s'ha proporcionat cap arxiu al camp 'document'.");

    const mindeeResponse = await fetch(MINDEE_API_URL, { method: 'POST', headers: { 'Authorization': `Token ${MINDEE_API_KEY}` }, body: formData });
    if (!mindeeResponse.ok) throw new Error(`Error de Mindee: ${JSON.stringify(await mindeeResponse.json())}`);
    
    const result = await mindeeResponse.json();
    const prediction = result.document.inference.prediction;

    let contactId = null;
    let supplierId = null;
    const customerName = prediction.customer_name?.value;
    const supplierName = prediction.supplier_name?.value;

    if (customerName) {
      const { data: foundContact } = await supabaseAdmin.from('contacts').select('id').eq('user_id', user.id).ilike('nom', `%${customerName}%`).limit(1).single();
      if (foundContact) contactId = foundContact.id;
      else {
        const { data: newContact } = await supabaseAdmin.from('contacts').insert({ user_id: user.id, nom: customerName, estat: 'Client' }).select('id').single();
        if (newContact) contactId = newContact.id;
      }
    }
    
    if (supplierName) {
        const { data: foundSupplier } = await supabaseAdmin.from('suppliers').select('id').eq('user_id', user.id).ilike('nom', `%${supplierName}%`).limit(1).single();
        if (foundSupplier) {
            supplierId = foundSupplier.id;
        } else {
            const { data: newSupplier } = await supabaseAdmin.from('suppliers').insert({ user_id: user.id, nom: supplierName }).select('id').single();
            if (newSupplier) supplierId = newSupplier.id;
        }
    }
    
    const lineItems = (prediction.line_items || []).map(item => ({
      description: item.description || '',
      quantity: item.quantity || 1,
      unit_price: item.unit_price || 0,
    }));
    
    const lineItemsSubtotal = lineItems.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
    const mindeeSubtotal = prediction.total_net?.value || lineItemsSubtotal;
    const discountAmount = parseFloat((lineItemsSubtotal - mindeeSubtotal).toFixed(2));

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
    
    return new Response(JSON.stringify(extractedData), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
  } catch (error) {
    console.error('[ERROR PROCESSAR-FACTURA]', error.message);
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
});