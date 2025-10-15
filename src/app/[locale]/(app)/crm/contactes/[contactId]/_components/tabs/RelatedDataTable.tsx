// /app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/RelatedDataTable.tsx (Refactoritzat)

import Link from 'next/link';
import { FC } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

// ✅ 1. Ajustem el tipus 'id' per a acceptar 'number' a més de 'string'.
type DataItem = { 
    id: string | number; 
    status?: string | null; 
    stage_name?: string | null; 
    total?: number | null; 
    value?: number | null; 
    name?: string | null; 
    quote_number?: string | null; 
    invoice_number?: string | null; 
};

interface Column { 
    key: string; 
    label: string; 
}

interface Props { 
    data: DataItem[]; 
    columns: Column[]; 
    linkPath?: string; 
    emptyMessage: string; 
}

export const RelatedDataTable: FC<Props> = ({ data, columns, linkPath, emptyMessage }) => {
    if (data.length === 0) return <EmptyState message={emptyMessage} />;

    return (
        <Table>
            <TableHeader><TableRow>{columns.map(col => <TableHead key={col.key} className={col.key === 'total' ? 'text-right' : ''}>{col.label}</TableHead>)}</TableRow></TableHeader>
            <TableBody>
                {data.map((item) => (
                    <TableRow key={item.id}>
                        <TableCell className="font-medium">
                            {linkPath ? <Link href={`${linkPath}/${item.id}`} className="text-primary hover:underline">{item.name || item.quote_number || item.invoice_number}</Link> : item.name || item.invoice_number}
                        </TableCell>
                        <TableCell><StatusBadge status={item.status || item.stage_name} /></TableCell>
                        <TableCell className="text-right font-semibold">€{((item.total || item.value) || 0).toLocaleString('ca-ES')}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};