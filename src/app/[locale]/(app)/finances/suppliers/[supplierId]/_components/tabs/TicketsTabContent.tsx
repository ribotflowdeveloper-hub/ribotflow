// /app/[locale]/(app)/finances/suppliers/[supplierId]/_components/tabs/TicketsTabContent.tsx (MILLORAT PER A MÒBIL)
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Inbox } from 'lucide-react';
import { type TicketForSupplier } from '@/types/db';
import { formatDate } from '@/lib/utils/formatters';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface TicketsTabContentProps {
  tickets: TicketForSupplier[];
  supplierEmail: string | null | undefined;
  t: (key: string) => string;
}

export function TicketsTabContent({ tickets, supplierEmail, t }: TicketsTabContentProps) {
  const router = useRouter();

  return (
    <Card>
      {/* ✅ MILLORA MÒBIL: Capçalera apilable */}
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />{t('ticketsCard.title')}</CardTitle>
          <CardDescription>{t('ticketsCard.description')}</CardDescription>
        </div>
        {supplierEmail && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push(`/comunicacio/inbox?search=${encodeURIComponent(supplierEmail)}`)}
            className="w-full sm:w-auto" // Amplada adaptativa
          >
            <Search className="h-4 w-4 mr-2" />
            {t('ticketsCard.searchInboxButton')}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {tickets.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ticketsCard.table.subject')}</TableHead>
                {/* ✅ MILLORA MÒBIL: Amaguem Última Activitat */}
                <TableHead className="hidden sm:table-cell">{t('ticketsCard.table.lastActivity')}</TableHead>
                <TableHead>{t('ticketsCard.table.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    {ticket.subject || t('ticketsCard.noSubject')}
                  </TableCell>
                  {/* ✅ MILLORA MÒBIL: Amaguem Última Activitat */}
                  <TableCell className="hidden sm:table-cell">
                    {ticket.sent_at 
                      ? formatDate(ticket.sent_at, "true") 
                      : 'N/A'}
                  </TableCell>
                  <TableCell><StatusBadge status={ticket.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">{t('ticketsCard.empty')}</p>
        )}
      </CardContent>
    </Card>
  );
}