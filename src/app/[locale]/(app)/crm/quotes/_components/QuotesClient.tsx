/**
 * @file QuotesClient.tsx
 * @summary Aquest fitxer conté el component de client que renderitza la llista principal de pressupostos.
 * S'encarrega de mostrar les dades en una taula i de gestionar les interaccions de l'usuari,
 * com l'eliminació d'un pressupost, mitjançant un diàleg de confirmació i una Server Action.
 */

"use client"; // És un component de client perquè gestiona l'estat de la UI (ex: el diàleg d'eliminació).

import React, { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, Trash2, Edit } from 'lucide-react';
import type { QuoteWithContact } from '../page';
import { deleteQuoteAction } from '../actions';
import { useTranslations, useLocale } from 'next-intl'; // ✅ Imports per a la traducció
import { QUOTE_STATUS_MAP } from '@/types/crm'; // ✅ 1. Importem el nou mapa

export function QuotesClient({ initialQuotes }: { initialQuotes: QuoteWithContact[] }) {
  // ✅ Hooks per a la traducció i l'estat local.
  const t = useTranslations('QuotesPage');
  const locale = useLocale();
  // Estat per emmagatzemar el pressupost que s'està a punt d'eliminar. Controla la visibilitat de l'AlertDialog.
  const [quoteToDelete, setQuoteToDelete] = useState<QuoteWithContact | null>(null);
  // Hook per gestionar l'estat de càrrega de l'eliminació sense bloquejar la interfície.
  const [isPending, startTransition] = useTransition();

  /**
   * @summary Gestor per a l'eliminació d'un pressupost. S'executa quan l'usuari confirma al diàleg.
   */
  const handleDelete = () => {
    if (!quoteToDelete) return;

    // 'startTransition' embolcalla l'acció asíncrona. Mentre s'executa, 'isPending' serà true.
    startTransition(async () => {
      const result = await deleteQuoteAction(quoteToDelete.id); // Cridem a la Server Action.
      if (result.success) {
        toast.success('Èxit!',{description: result.message}  );
      } else {
        toast.error('Error', {description: result.message });
      }
      setQuoteToDelete(null); // Tanquem el diàleg un cop finalitzada l'acció.
    });
  };

  return (
  <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="glass-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('table.number')}</TableHead>
              <TableHead>{t('table.client')}</TableHead>
              <TableHead>{t('table.issueDate')}</TableHead>
              <TableHead>{t('table.total')}</TableHead>
              <TableHead>{t('table.status')}</TableHead>
              <TableHead className="text-right">{t('table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialQuotes.length > 0 ? initialQuotes.map(quote => {
              // ✅ 3. Busquem la informació de l'estat directament del nostre mapa.
              const statusInfo = QUOTE_STATUS_MAP.find(s => s.dbValue === quote.status) 
              || { key: 'unknown', colorClass: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' };
              return (
                <TableRow key={quote.id}>
                  <TableCell className="font-medium">{quote.quote_number || `PRE-${quote.id.substring(0,6)}`}</TableCell>
                  <TableCell>{quote.contacts?.nom || t('noClient')}</TableCell>
                  <TableCell>{new Date(quote.issue_date).toLocaleDateString(locale)}</TableCell>
                  <TableCell>€{quote.total?.toLocaleString(locale, { minimumFractionDigits: 2 }) || '0,00'}</TableCell>
                  <TableCell>
                  {/* ✅ 4. Utilitzem directament les dades del mapa */}
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusInfo.colorClass}`}>
                        {t(`status.${statusInfo.key}`)}
                      </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/crm/quotes/${quote.id}`} className="inline-flex items-center justify-center ... h-10 w-10" title={t('actions.edit')}>
                      <Edit className="w-4 h-4" />
                    </Link>
                    <Button variant="ghost" size="icon" title={t('actions.delete')} onClick={() => setQuoteToDelete(quote)} disabled={isPending}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center h-24">
                  {t('emptyState')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!quoteToDelete} onOpenChange={() => setQuoteToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description1')}
              <span className="font-bold"> {quoteToDelete?.quote_number}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>{t('deleteDialog.cancelButton')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90" disabled={isPending}>
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isPending ? t('deleteDialog.deleting') : t('deleteDialog.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  </>
);
};