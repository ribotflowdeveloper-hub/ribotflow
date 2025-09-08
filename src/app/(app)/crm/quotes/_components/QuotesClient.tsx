"use client";

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Edit } from 'lucide-react';
import type { QuoteWithContact } from '../page'; // Importem el tipus definit a la pàgina
import { deleteQuoteAction } from '../actions'; // Importem la nostra Server Action

export function QuotesClient({ initialQuotes }: { initialQuotes: QuoteWithContact[] }) {
  const { toast } = useToast();
  // Estat per controlar quin pressupost es vol esborrar i mostrar el diàleg
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithContact | null>(null);
  // Hook per gestionar l'estat de càrrega de la Server Action
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!quoteToDelete) return;

    startTransition(async () => {
      const result = await deleteQuoteAction(quoteToDelete.id);
      if (result.success) {
        toast({ title: 'Èxit!', description: result.message });
      } else {
        toast({ variant: 'destructive', title: 'Error', description: result.message });
      }
      setQuoteToDelete(null); // Tanquem el diàleg
    });
  };

  const getStatusInfo = (status: QuoteWithContact['status']) => {
    switch (status) {
      case 'Draft': return { text: 'Esborrany', color: 'bg-yellow-100 text-yellow-800' };
      case 'Sent': return { text: 'Enviat', color: 'bg-blue-100 text-blue-800' };
      case 'Accepted': return { text: 'Acceptat', color: 'bg-green-300 text-green-800' };
      case 'Declined': return { text: 'Rebutjat', color: 'bg-red-100 text-red-800' };
      default: return { text: status || 'Desconegut', color: 'bg-gray-100 text-gray-800' };
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="glass-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Data Emissió</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Estat</TableHead>
                <TableHead className="text-right">Accions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialQuotes.length > 0 ? initialQuotes.map(quote => {
                const statusInfo = getStatusInfo(quote.status);
                return (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">{quote.quote_number || `PRE-${quote.id.substring(0,6)}`}</TableCell>
                    <TableCell>{quote.contacts?.nom || 'N/A'}</TableCell>
                    <TableCell>{new Date(quote.issue_date).toLocaleDateString()}</TableCell>
                    <TableCell>€{quote.total?.toLocaleString('es-ES', { minimumFractionDigits: 2 }) || '0,00'}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.color}`}>
                        {statusInfo.text}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/crm/quotes/${quote.id}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10" title="Editar">
                        <Edit className="w-4 h-4" />
                      </Link>
                      <Button variant="ghost" size="icon" title="Esborrar" onClick={() => setQuoteToDelete(quote)} disabled={isPending}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    No s'han trobat pressupostos. Crea'n un de nou!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <AlertDialog open={!!quoteToDelete} onOpenChange={() => setQuoteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Estàs absolutament segur?</AlertDialogTitle>
              <AlertDialogDescription>
                Aquesta acció no es pot desfer. S'esborrarà permanentment el pressupost
                <span className="font-bold"> {quoteToDelete?.quote_number}</span>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Cancel·lar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Sí, esborra'l
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </>
  );
};
