// src/app/[locale]/(app)/crm/contactes/[contactId]/_components/tabs/RelatedDataTable.tsx
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { 
    Table, 
    TableBody, 
    TableCell, 
    TableHead, 
    TableHeader, 
    TableRow 
} from "@/components/ui/table";
import { ModuleCard } from '@/components/shared/ModuleCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileText, DollarSign, Briefcase } from 'lucide-react';

// Tipus
import type { Quote, Opportunity, Invoice } from '@/types/db';
import type { RelatedDataKey } from '../ContactViewSwitcher';

interface Props<K extends RelatedDataKey> {
    type: K;
    // Utilitzem un tipus d'unió per simplificar la validació dins del component
    data: (Quote | Opportunity | Invoice)[];
}

export const RelatedDataTable = <K extends RelatedDataKey>({ type, data }: Props<K>) => {
    const t = useTranslations('ContactDetailPage');

    // Configuració de columnes i renderitzat
    const config = {
        opportunities: {
            title: t('tabs.opportunities'),
            icon: Briefcase,
            headers: [t('table.name'), t('table.status'), t('table.value'), t('table.date')],
            renderRow: (item: Opportunity) => (
                <>
                    <TableCell className="font-medium">
                        <Link href={`/crm/pipeline?id=${item.id}`} className="text-primary hover:underline">
                            {item.name} {/* ✅ Corregit: 'name' en lloc de 'nom' */}
                        </Link>
                    </TableCell>
                    {/* Si 'status' no existeix a Opportunity, utilitza un fallback segur */}
                    <TableCell>
                        <StatusBadge status={item.pipeline_stage_id ? `Stage ${item.pipeline_stage_id}` : 'Open'} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                        {item.value ? `€${item.value.toLocaleString()}` : '-'} {/* ✅ Corregit: 'value' en lloc de 'valor' */}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                </>
            )
        },
        quotes: {
            title: t('tabs.quotes'),
            icon: FileText,
            headers: [t('table.number'), t('table.status'), t('table.total'), t('table.date')],
            renderRow: (item: Quote) => (
                <>
                    <TableCell className="font-medium">
                        <Link href={`/finances/quotes/${item.id}`} className="text-primary hover:underline">
                            {item.quote_number}
                        </Link>
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-right font-mono">
                        €{item.total_amount?.toLocaleString() ?? '0'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : '-'}
                    </TableCell>
                </>
            )
        },
        invoices: {
            title: t('tabs.invoices'),
            icon: DollarSign,
            headers: [t('table.number'), t('table.status'), t('table.total'), t('table.date')],
            renderRow: (item: Invoice) => (
                <>
                    <TableCell className="font-medium">
                        <Link href={`/finances/invoices/${item.id}`} className="text-primary hover:underline">
                            {item.invoice_number}
                        </Link>
                    </TableCell>
                    <TableCell><StatusBadge status={item.status} /></TableCell>
                    <TableCell className="text-right font-mono">
                        €{item.total_amount?.toLocaleString() ?? '0'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                        {item.issue_date ? new Date(item.issue_date).toLocaleDateString() : '-'}
                    </TableCell>
                </>
            )
        }
    };

    const currentConfig = config[type];

    return (
        <ModuleCard title={currentConfig.title} icon={currentConfig.icon} defaultOpen={true}>
            {data.length > 0 ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                {currentConfig.headers.map((header, idx) => (
                                    <TableHead key={idx} className={header.includes('€') || idx === 2 ? 'text-right' : ''}>
                                        {header}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((item) => (
                                <TableRow key={item.id}>
                                    {/* Fem un cast específic segons el tipus actual per evitar 'any' */}
                                    {type === 'opportunities' &&
                                        config.opportunities.renderRow(item as Opportunity)}
                                    {type === 'quotes' &&
                                        config.quotes.renderRow(item as Quote)}
                                    {type === 'invoices' &&
                                        config.invoices.renderRow(item as Invoice)}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
                    <p>{t('emptyStates.' + type)}</p>
                </div>
            )}
        </ModuleCard>
    );
};