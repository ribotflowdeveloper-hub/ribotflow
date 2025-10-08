"use server";

import { validateUserSession } from "@/lib/supabase/session";
import ExcelJS from 'exceljs';
import type { Contact } from "@/types/crm";

export async function exportToExcel(tableName: string, withData: boolean) {
    try {
        // 1. Validació de la sessió per obtenir l'usuari i l'equip actiu
        const session = await validateUserSession();
        if ('error' in session) {
            return { success: false, message: session.error.message };
        }
        const { supabase, user, activeTeamId } = session;

        // 2. Definir una variable per emmagatzemar les dades
        let contacts: Contact[] = [];

        // 3. Condició per a obtenir les dades si withData és true
        if (withData) {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .filter('team_id', 'eq', activeTeamId)
                .order('created_at', { ascending: false });

            if (error) {
                throw new Error(`Error en obtenir les dades: ${error.message}`);
            }
            contacts = data as Contact[];
        }

        // 4. Creem un nou llibre d'Excel i una pestanya
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(tableName);

        // 5. Definim les columnes de l'Excel
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Nom', key: 'nom', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Data de Creació', key: 'created_at', width: 20 },
            { header: 'Empresa', key: 'empresa', width: 20 },
        ];

        // 6. Afegim les dades a les files només si withData és true
        if (withData) {
            worksheet.addRows(contacts);
        }

        // 7. Generem el fitxer Excel en memòria
        const buffer = await workbook.xlsx.writeBuffer();

        // 8. Retornem el buffer i el nom del fitxer
        const now = new Date();
        const pad = (num: number) => num.toString().padStart(2, '0');
        const fileName = `${tableName}_${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.xlsx`;

        return {
            success: true,
            fileBuffer: Buffer.from(buffer).toString('base64'),
            fileName,
        };

    } catch (error) {
        console.error("Error en exportar a Excel:", error);
        const message = error instanceof Error ? error.message : "Error desconegut";
        return { success: false, message };
    }
}

