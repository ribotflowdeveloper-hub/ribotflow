// src/app/[locale]/(app)/excel/upload/page.tsx
export default function CrearPlantillaPage() {
  return (
    <div>
      <h1>Crear Plantilla</h1>
      <p>Crea una nova plantilla de la taula seleccionada.</p>
    </div>
  );
}/*// src/app/[locale]/(app)/excel/create/page.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTables, getTableStructure } from './actions';
import Loading from '../../loading';

// ✅ Importem els tipus de XLSX
import type * as XLSX from 'xlsx';

export default function CrearPlantillaPage() {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // ✅ Estat tipat com a tot el namespace XLSX
    const [xlsx, setXlsx] = useState<typeof XLSX | null>(null);

    useEffect(() => {
        const loadXlsx = async () => {
            try {
                // ✅ Assignem el tipus explícit
                const mod: typeof XLSX = await import('xlsx');
                setXlsx(mod);
            } catch (err) {
                console.error("Error loading xlsx module:", err);
            }
        };

        const fetchTables = async () => {
            const result = await getTables();
            if (result.success && result.data) {
                setTables(result.data);
            } else {
                setError(result.error);
            }
        };

        loadXlsx();
        fetchTables();
    }, []);

    const handleCreateExcel = async () => {
        if (!selectedTable || !xlsx) {
            setError('Si us plau, selecciona una taula.');
            return;
        }

        setIsLoading(true);
        setError(null);

        const result = await getTableStructure(selectedTable);

        if (result.success && result.data) {
            const columnNames = result.data;
            
            // ✅ Ara TypeScript ja sap que existeix book_new, etc.
            const workbook = xlsx.utils.book_new();
            const worksheet = xlsx.utils.aoa_to_sheet([columnNames]);
            
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Plantilla');

            xlsx.writeFile(workbook, `${selectedTable}_template.xlsx`);
        } else {
            setError(result.error);
        }

        setIsLoading(false);
    };

    if (!xlsx) {
        return <Loading />;
    }

    return (
        <div className="flex flex-col gap-4 p-4 md:p-6">
            <h1 className="text-2xl font-bold">Crear Plantilla d'Excel</h1>
            <p>Selecciona una taula de la base de dades per generar una plantilla d'Excel.</p>

            <div className="flex items-center gap-4">
                <Select onValueChange={setSelectedTable}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Selecciona una taula" />
                    </SelectTrigger>
                    <SelectContent>
                        {tables.length > 0 ? (
                            tables.map(table => (
                                <SelectItem key={table} value={table}>{table}</SelectItem>
                            ))
                        ) : (
                            <SelectItem value="no-tables" disabled>No hi ha taules disponibles</SelectItem>
                        )}
                    </SelectContent>
                </Select>
                <Button onClick={handleCreateExcel} disabled={!selectedTable || isLoading}>
                    {isLoading ? 'Creant...' : 'Crear Excel'}
                </Button>
            </div>
            {error && <p className="text-red-500 mt-2">{error}</p>}
        </div>
    );
}
*/