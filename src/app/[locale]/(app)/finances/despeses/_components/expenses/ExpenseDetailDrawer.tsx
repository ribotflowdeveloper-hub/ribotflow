/**
 * @file ExpenseDetailDrawer.tsx
 * @summary Aquest fitxer defineix un component de client que mostra un calaix lateral (drawer)
 * amb els detalls complets d'una despesa. S'encarrega de calcular i formatar les dades
 * financeres, obtenir les URLs dels fitxers adjunts des de Supabase Storage i gestionar la seva descàrrega.
 */

"use client";

import React, { useState, useEffect, FC } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Paperclip, Edit, Download } from 'lucide-react';
import { format } from "date-fns";
import { ca, es, enUS } from "date-fns/locale";
import { toast } from 'sonner';
import { type Expense } from '../../types';
import { useLocale, useTranslations } from 'next-intl';

interface ExpenseDetailDrawerProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (expense: Expense) => void;
}

// Tipus per a un adjunt que inclou la seva URL pública.
type AttachmentWithUrl = {
  id: string;
  publicUrl: string;
  filename: string;
  mime_type: string;
};

export const ExpenseDetailDrawer: FC<ExpenseDetailDrawerProps> = ({ expense, isOpen, onClose, onEdit }) => {
  const [attachmentUrls, setAttachmentUrls] = useState<AttachmentWithUrl[]>([]);
  const supabase = createClient()
;
  const t = useTranslations('Expenses');
  const locale = useLocale();

  const getDateLocale = () => {
    switch (locale) {
      case 'es': return es;
      case 'en': return enUS;
      default: return ca;
    }
  };
  // Aquest efecte s'executa quan el component rep una nova despesa.
  // La seva funció és obtenir les URLs públiques dels fitxers adjunts des de Supabase Storage.
  useEffect(() => {
    if (expense && expense.expense_attachments) {
      const urls = expense.expense_attachments.map(att => {
        const { data } = supabase.storage.from('despeses-adjunts').getPublicUrl(att.file_path);
        return { ...att, publicUrl: data.publicUrl };
      });
      setAttachmentUrls(urls);
    }
  }, [expense, supabase.storage]);

  /**
   * @summary Gestor per a la descàrrega d'un fitxer adjunt des del navegador.
   */
  const handleDownload = async (attachment: { publicUrl: string, filename: string }) => {
    try {
      // Fem una petició 'fetch' per obtenir el contingut del fitxer.
      const response = await fetch(attachment.publicUrl);
      if (!response.ok) throw new Error('Network response was not ok.');
      // Convertim la resposta en un 'Blob'.
      const blob = await response.blob();
      // Creem una URL temporal al navegador per a aquest 'Blob'.
      const url = window.URL.createObjectURL(blob);
      // Creem un element <a> invisible, hi assignem la URL i el nom del fitxer, i simulem un clic per iniciar la descàrrega.
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = attachment.filename;
      document.body.appendChild(a);
      a.click();
      // Neteja: eliminem l'URL i l'element <a> del DOM.
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      toast.error(t('downloadErrorTitle'), { description: t('downloadErrorDescription') });
    }
  };

  // Si no hi ha cap despesa seleccionada, no renderitzem res.
  if (!expense) return null;

  // Calculem la base imposable per a la seva visualització.
  const baseImposable = (expense.subtotal || 0) - (expense.discount_amount || 0);


  return (
    <Drawer open={isOpen} onClose={onClose}>
      {/* ✅ CORRECCIÓ: DrawerContent ja gestiona els colors de fons i text per a cada tema. */}
      <DrawerContent className="p-6">
        <div className="max-w-4xl mx-auto w-full">
          <DrawerHeader className="text-left p-0 mb-4">
            <DrawerTitle className="text-2xl font-bold">
              {expense.suppliers?.nom || expense.description}
            </DrawerTitle>
            <DrawerDescription>
              {expense.invoice_number ? t('drawerDescInvoice', { invoiceNumber: expense.invoice_number }) : t('drawerDescNoInvoice')}
            </DrawerDescription>
          </DrawerHeader>

          <div className="grid md:grid-cols-3 gap-6">
            {/* --- Adjunts --- */}
            <div className="md:col-span-1 space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Paperclip className="w-4 h-4" /> {t('attachments')}
              </h3>
              {attachmentUrls.length > 0 ? (
                <div className="space-y-2">
                  {attachmentUrls.map(att => (
                    // ✅ CORRECCIÓ: Usem 'bg-muted' per a un fons que s'adapta.
                    <div key={att.id} className="bg-muted p-2 rounded-lg flex items-center justify-between">
                      <a href={att.publicUrl} target="_blank" rel="noopener noreferrer" className="truncate text-sm hover:underline">
                        {att.filename}
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => handleDownload(att)}>
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t('noAttachments')}</p>
              )}
            </div>


            {/* --- Detall --- */}
            {/* ✅ CORRECCIÓ: Usem 'bg-muted' per a un fons que s'adapta. */}
            <div className="md:col-span-2 bg-muted p-6 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('date')}</span>
                <span>{expense.expense_date ? format(new Date(expense.expense_date), "PPP", { locale: getDateLocale() }) : '-'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">{t('category')}</span>
                <Badge variant="secondary" className={undefined}>{expense.category || t('noCategory')}</Badge>
              </div>
              <div className="border-t border-border my-4"></div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><p className="text-muted-foreground">{t('subtotal')}</p><p className="font-mono">€{(expense.subtotal || 0).toFixed(2)}</p></div>
                {expense.discount_amount && expense.discount_amount > 0 && (
                  <div className="flex justify-between text-orange-500 dark:text-orange-400">
                    <p>{t('discount')}</p>
                    <p className="font-mono">-€{(expense.discount_amount).toFixed(2)}</p>
                  </div>
                )}
                <div className="flex justify-between"><p className="text-muted-foreground">{t('taxBase')}</p><p className="font-mono">€{baseImposable.toFixed(2)}</p></div>
                <div className="flex justify-between"><p className="text-muted-foreground">{t('vat', { taxRate: expense.tax_rate || 21 })}</p><p className="font-mono">€{(expense.tax_amount || 0).toFixed(2)}</p></div>
              </div>
              <div className="flex justify-between items-center text-xl font-bold border-t border-foreground/20 pt-2 mt-2">
                <p>{t('total')}</p>
                <p className="font-mono">- €{(expense.total_amount || 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Peu del calaix amb els botons d'acció */}
          <DrawerFooter className="flex-row justify-start p-0 pt-6 gap-2">
            <Button onClick={() => onEdit(expense)}>
              <Edit className="w-4 h-4 mr-2" />  {t('editButton')}
            </Button>
            <Button variant="outline" onClick={onClose}>
              {t('closeButton')}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
