"use server";

import { createAdminClient } from "@/lib/supabase/admin"; // Client admin per accedir a les dades
import ExcelJS from 'exceljs';

// Defineix aquí el tipus de dades del teu contacte per tenir autocompletat
type Contact = {
  id: number;
  name: string | null;
  email: string | null;
  created_at: string;
  // Afegeix altres camps que tinguis
};

export async function exportContactsToExcel() {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Obtenim totes les dades de la taula 'contacts'
    const { data: contacts, error } = await supabaseAdmin
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Error en obtenir els contactes: ${error.message}`);
    }
    
    // 2. Creem un nou llibre d'Excel i una pestanya
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Contactes');

    // 3. Definim les columnes de l'Excel
    // La clau 'key' ha de coincidir amb el nom del camp a les dades
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Nom', key: 'name', width: 30 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Data de Creació', key: 'created_at', width: 20 },
      { header: 'Empresa', key: 'empresa', width: 20 },
      // Afegeix les altres columnes que vulguis exportar
    ];

    // 4. Afegim les dades a les files
    worksheet.addRows(contacts as Contact[]);

    // 5. Generem el fitxer Excel en memòria (com a buffer)
    const buffer = await workbook.xlsx.writeBuffer();

    // Retornem el buffer i el nom del fitxer
    return {
      success: true,
      fileBuffer: Buffer.from(buffer).toString('base64'), // Ho passem a base64 per ser compatible amb el client
      fileName: `contactes_${new Date().toISOString().split('T')[0]}.xlsx`,
    };

  } catch (error) {
    console.error("Error en exportar a Excel:", error);
    const message = error instanceof Error ? error.message : "Error desconegut";
    return { success: false, message };
  }
}