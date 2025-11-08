"use client";

// ✅ 1. Importem 'useState', 'useEffect' i els components que falten
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Save, Settings2, Eye, ArrowLeft, Lock, CheckCircle,
  Mail // ✅ 2. Importem la icona 'Mail'
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type InvoiceDetail } from '@/types/finances';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { InvoicePreview } from '../InvoicePreview'; 
import { type CompanyProfile } from '@/types/settings/team';
import { type Database } from '@/types/supabase';
import { useInvoiceDetail } from '../../_hooks/useInvoiceDetail';
import { Textarea } from '@/components/ui/textarea'; // ✅ 3. Importem 'Textarea'

type Contact = Database['public']['Tables']['contacts']['Row'];

type UseInvoiceDetailReturn = ReturnType<typeof useInvoiceDetail>;

const InvoiceDownloadButton = dynamic(
  () => import('../PDF/InvoiceDownloadButton').then(mod => mod.InvoiceDownloadButton), 
  {
    ssr: false,
    loading: () => (
      <Button type="button" variant="outline" disabled className='bg-card'>
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Carregant PDF...
      </Button>
    )
  }
);

// ✅ 4. *** CORRECCIÓ PRINCIPAL: Afegim les noves props a la interfície ***
interface InvoiceDetailHeaderProps {
  handleBack: () => void;
  title: string;
  description: string;
  t: UseInvoiceDetailReturn['t']; 
  formIsDisabled: boolean;
  formData: UseInvoiceDetailReturn['formData']; 
  handleFieldChange: UseInvoiceDetailReturn['handleFieldChange']; 
  isPreviewOpen: boolean;
  setIsPreviewOpen: (isOpen: boolean) => void;
  isSaving: boolean;
  initialData: InvoiceDetail | null;
  company: CompanyProfile | null;
  contact: Contact | null;
  isLocked: boolean;
  isPending: boolean;
  isNew: boolean;
  handleFinalize: () => void;
  isFinalizing: boolean;

  // <-- AQUESTES SÓN LES LÍNIES QUE FALTAVEN -->
  isSendEmailDialogOpen: boolean;
  setIsSendEmailDialogOpen: (isOpen: boolean) => void;
  handleSendEmail: (email: string, message: string) => Promise<void>;
  isSendingEmail: boolean;
  // <-- FI DE LES LÍNIES QUE FALTAVEN -->
}

export function InvoiceDetailHeader({
  handleBack,
  title,
  description,
  t,
  formIsDisabled,
  formData,
  handleFieldChange,
  isPreviewOpen,
  setIsPreviewOpen,
  isSaving,
  initialData,
  company,
  contact,
  isLocked,
  isPending,
  isNew,
  handleFinalize,
  isFinalizing,

  // ✅ 5. Desestructurem les noves props
  isSendEmailDialogOpen,
  setIsSendEmailDialogOpen,
  handleSendEmail,
  isSendingEmail,
}: InvoiceDetailHeaderProps) {

  // ✅ 6. Estats interns pel formulari del diàleg
  const [recipientEmail, setRecipientEmail] = useState(contact?.email || '');
  const [messageBody, setMessageBody] = useState('');

  // ✅ 7. Efecte per omplir els camps del diàleg quan s'obre
  useEffect(() => {
    if (isSendEmailDialogOpen) {
      // Omplim l'email del contacte seleccionat
      setRecipientEmail(contact?.email || '');
      
      // Creem un missatge per defecte
      const defaultMessage = 
        t('sendEmailDialog.defaultMessage', { 
            invoiceNumber: formData.invoice_number || initialData?.invoice_number || formData.id || 'N/A',
            companyName: company?.company_name || t('yourCompany')
          }) 
        || 
        `Bon dia,\n\nAdjuntem la factura ${formData.invoice_number || initialData?.invoice_number || formData.id}.\n\nGràcies per la teva confiança.\n\nSalutacions,\n${company?.company_name || ''}`;
      
      setMessageBody(defaultMessage.replace(/\\n/g, '\n')); // Assegurem salts de línia
    }
  }, [
      contact, 
      isSendEmailDialogOpen, 
      t, 
      formData.invoice_number, 
      initialData?.invoice_number, 
      formData.id, 
      company?.company_name
    ]);


  return (
    <header
      className="
      sticky top-[--header-height] z-30 border-b bg-background/90 backdrop-blur-sm 
      px-3 sm:px-6 py-2 sm:py-3 shadow-sm
      flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3
    "
    >
      {/* --- Esquerra: Títol + Back --- */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleBack}
          aria-label={t('button.goBack')}
          className="shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div>
          <h1 className="text-lg sm:text-xl font-semibold leading-tight">
            {title}
          </h1>
          {description && (
            <p className="text-xs sm:text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* --- Dreta: Accions --- */}
      <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3">
        {/* ⚙️ Configuració */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={formIsDisabled}
              className="flex items-center gap-1"
            >
              <Settings2 className="h-4 w-4" />
              <span className="hidden sm:inline">{t('button.options')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t('field.currency')}</Label>
              <Input
                id="currency"
                value={formData.currency || 'EUR'}
                onChange={(e) =>
                  handleFieldChange('currency', e.target.value.toUpperCase())
                }
                disabled={formIsDisabled}
                maxLength={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">{t('field.language')}</Label>
              <Input
                id="language"
                value={formData.language || 'ca'}
                onChange={(e) => handleFieldChange('language', e.target.value)}
                disabled={formIsDisabled}
                maxLength={5}
              />
            </div>
          </PopoverContent>
        </Popover>

        {/* 👁️ Previsualització */}
        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSaving}
              className="flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">{t('button.preview')}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('preview.title')}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-grow py-4 pr-6 -mr-6">
              <InvoicePreview
                formData={formData}
                companyProfile={company}
                clientProfile={contact}
              />
            </ScrollArea>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t('button.close')}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ⬇️ Descarregar PDF */}
        {/* Mostrem el botó si no és Esborrany i tenim les dades */}
        {formData.status !== 'Draft' && initialData && company && (
          <InvoiceDownloadButton
            invoice={initialData}
            company={company}
            contact={contact} // Pot ser null, el component ho hauria de gestionar
          />
        )}

        {/* ✅ 8. NOU BOTÓ I DIÀLEG: Enviar per Email */}
        {/* Mostrem el botó si no és Esborrany (p.ex. 'Sent', 'Paid') */}
        {formData.status !== 'Draft' && (
          <Dialog open={isSendEmailDialogOpen} onOpenChange={setIsSendEmailDialogOpen}>
            <DialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSaving || isSendingEmail} // Desactivat si s'està desant o enviant
                className="flex items-center gap-1"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">{t('button.sendByEmail')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('sendEmailDialog.title')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <p className="text-sm text-muted-foreground">
                  {t('sendEmailDialog.description')}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="recipientEmail">
                    {t('sendEmailDialog.recipient')}
                  </Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="email@client.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="messageBody">
                    {t('sendEmailDialog.message')}
                  </Label>
                  <Textarea
                    id="messageBody"
                    value={messageBody}
                    onChange={(e) => setMessageBody(e.target.value)}
                    rows={8}
                    placeholder={t('sendEmailDialog.messagePlaceholder')}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" disabled={isSendingEmail}>
                    {t('button.cancel')}
                  </Button>
                </DialogClose>
                <Button
                  type="button"
                  onClick={() => handleSendEmail(recipientEmail, messageBody)}
                  disabled={isSendingEmail || !recipientEmail || !messageBody}
                  className='min-w-[100px]'
                >
                  {isSendingEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4 mr-2" />
                  )}
                  {isSendingEmail ? t('button.sending') : t('button.send')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* 💾 Desa / 🧾 Emissió */}
        {/* Aquests botons només apareixen si NO està bloquejat (és a dir, és 'Draft') */}
        {!isLocked && (
          <>
            <Button
              type="submit"
              disabled={isSaving}
              size="sm"
              className="flex items-center gap-1 min-w-[100px]"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {isPending ? t('button.saving') : t('button.saveDraft')}
              </span>
            </Button>
          
            {!isNew && (
              <Button
                type="button"
                variant="default"
                onClick={handleFinalize}
                disabled={isSaving}
                size="sm"
                className="flex items-center gap-1 min-w-[110px]"
              >
                {isFinalizing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">
                  {isFinalizing ? t('button.issuing') : t('button.issueInvoice')}
                </span>
              </Button>
            )}
          </>
        )}

        {/* 🔒 Estat enviat */}
        {isLocked && (
          <Badge
            variant="outline"
            className="text-muted-foreground border-green-500 text-green-600"
          >
            <Lock className="w-4 h-4 mr-1" />
            {t('status.Sent')}
          </Badge>
        )}
      </div>
    </header>
  );
}