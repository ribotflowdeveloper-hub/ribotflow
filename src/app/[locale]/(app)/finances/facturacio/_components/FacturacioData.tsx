// /app/[locale]/finances/facturacio/_components/FacturacioData.tsx

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { FacturacioClient } from './FacturacioClient';
import type { Invoice, Contact } from '../types'; 
import type { Product } from '@/types/crm/products'; 



export async function FacturacioData() {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n--- [SERVER] INICI FacturacioData @ ${timestamp} ---`);

    const supabase = createClient(cookies());
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        console.error(`[SERVER_ERROR @ ${timestamp}] Usuari no trobat. S'atura l'execució.`);
        return null;
    }
    console.log(`[SERVER @ ${timestamp}] PAS 1: Usuari autenticat: ${user.id}`);

    const { data: claimsString, error: claimsError } = await supabase.rpc('get_current_jwt_claims');

    if (claimsError || !claimsString) {
        console.error(`[SERVER_ERROR @ ${timestamp}] No s'ha pogut cridar a get_current_jwt_claims:`, claimsError);
        return <FacturacioClient initialInvoices={[]} initialContacts={[]} initialProducts={[]} />;
    }
    console.log(`[SERVER @ ${timestamp}] PAS 2: Claims rebuts de la BD: ${claimsString}`);

    const claims = JSON.parse(claimsString);
    const trueActiveTeamId = claims.app_metadata?.active_team_id;

    console.log(`[SERVER @ ${timestamp}] PAS 3: Equip actiu (VERITABLE) extret del token: ${trueActiveTeamId}`);
    
    if (!trueActiveTeamId) {
        console.warn(`[SERVER_WARN @ ${timestamp}] L'usuari no té equip actiu. Retornant client buit.`);
        return <FacturacioClient initialInvoices={[]} initialContacts={[]} initialProducts={[]} />;
    }
    
    console.log(`[SERVER @ ${timestamp}] PAS 4: Realitzant consultes per a l'equip ${trueActiveTeamId}...`);

    const [invoicesRes] = await Promise.all([
        supabase.from('invoices').select('*, contacts(id, nom), invoice_items(*)')
    ]);
    
    if (invoicesRes.error) {
        console.error(`[SERVER_ERROR @ ${timestamp}] Error en carregar factures:`, invoicesRes.error);
    }

    const invoices = invoicesRes.data || [];
    console.log(`[SERVER @ ${timestamp}] PAS 5: Dades rebudes de 'invoices'. Nombre de factures: ${invoices.length}`);
    
    if (invoices.length > 0) {
        const receivedTeamIds = [...new Set(invoices.map(inv => inv.team_id))];
        console.log(`[SERVER @ ${timestamp}] DEBUG: Els team_id de les factures rebudes són: ${receivedTeamIds.join(', ')}`);
        if (receivedTeamIds[0] !== trueActiveTeamId) {
            console.error(`🔥🔥🔥 [ERROR CRÍTIC @ ${timestamp}] DESAJUST! S'esperaven factures per a l'equip ${trueActiveTeamId} però s'han rebut per a ${receivedTeamIds[0]}`);
        }
    }

    // Per simplificar, traiem les altres consultes de moment
    const contacts: Contact[] = [];
    const products: Product[] = [];

    console.log(`--- [SERVER] FI FacturacioData @ ${timestamp} ---`);
    
    return <FacturacioClient initialInvoices={invoices} initialContacts={contacts} initialProducts={products} />;
}