"use client";

import React, { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic'; // 👈 1. Importar dynamic
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Settings2, Eye, ArrowLeft, Lock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

import { type InvoiceDetail } from '@/types/finances';
import { type CompanyProfile } from '@/types/settings/team';
import { type Contact } from '@/types/crm/contacts';
import { type UseInvoiceDetailReturn } from '../InvoiceDetailClient';
import { InvoicePreview } from '../InvoicePreview';

// 2. Treure la importació estàtica (la que donava problemes)
// import { InvoiceDownloadButton } from './PDF/InvoiceDownloadButton';

// 3. Definir el component de forma dinàmica AMB SSR DESACTIVAT
const InvoiceDownloadButton = dynamic(
  () => import('../PDF/InvoiceDownloadButton').then((mod) => mod.InvoiceDownloadButton),
  {
    ssr: false, // Això és la clau: no s'executarà al servidor
    loading: () => (
      // Mostrem un loader mentre el component JS es carrega al client
      <Button variant="outline" disabled className='bg-card'>
        <Loader2 className="w-4 h-4 animate-spin" />
      </Button>
    )
  }
);

interface InvoiceDetailHeaderProps {
  title: string;
  description: string;
  form: UseInvoiceDetailReturn;
  initialData: InvoiceDetail | null;
  company: CompanyProfile | null;
  contact: Contact | null;
  isNew: boolean;
}

export function InvoiceDetailHeader({
  title,
  description,
  form,
  initialData,
  company,
  contact,
  isNew,
}: InvoiceDetailHeaderProps) {

  const {
    formData,
    isPending,
    isFinalizing,
    isLocked,
    handleFieldChange,
    handleFinalize,
    t,
  } = form;

  const router = useRouter();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('from');

  const isSaving = isPending || isFinalizing;
  const formIsDisabled = isSaving || isLocked;

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const handleBack = () => {
    if (fromUrl) {
      router.push(fromUrl);
    } else {
      router.push('/finances/invoices');
    }
  };

  // El return és idèntic a l'anterior
  return (
    <div className="flex justify-between items-center gap-4 sticky top-[--header-height] bg-background  z-10 border-b mb-6 px-4 md:px-0 -mx-4 md:-mx-0 sm:-mx-6 ">
      {/* Part Esquerra */}
      <div className="flex items-center gap-3">
        <Button
          className='bg-card'
          type="button"
          variant="outline"
          size="icon"
          onClick={handleBack}
          aria-label={t('button.goBack')

          }
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl md:text-2xl font-semibold leading-tight">{title}</h1>
          {description && <p className="text-sm text-muted-foreground hidden md:block">{description}</p>}
        </div>
      </div>

      {/* Part Dreta */}
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" disabled={formIsDisabled} className='bg-card'>
              <Settings2 className="h-4 w-4" />
              <span className="sr-only">{t('button.options')}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-60 p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currency">{t('field.currency')}</Label>
              <Input
                id="currency"
                value={formData.currency || 'EUR'}
                onChange={(e) => handleFieldChange('currency', e.target.value.toUpperCase())}
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

        <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" disabled={isSaving} className='bg-card'>
              <Eye className="w-4 h-4 mr-2" />
              {t('button.preview')}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{t('preview.title')}</DialogTitle>
            </DialogHeader>
            <ScrollArea className="flex-grow py-4 pr-6 -mr-6">
              <InvoicePreview formData={formData} />
            </ScrollArea>
            <DialogFooter className="mt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">{t('button.close')}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 4. Aquesta secció ara utilitza el component carregat dinàmicament */}
        {/* El renderitzat és idèntic, però 'InvoiceDownloadButton' ara és la     */}
        {/* versió dinàmica que només s'executa al client.                   */}
        {formData.status !== 'Draft' && initialData && company && (
          <InvoiceDownloadButton
            invoice={initialData}
            company={company}
            contact={contact}
          />)}

        {!isLocked && (
          <Button type="submit" disabled={isSaving} className='bg-card'>
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {isPending ? t('button.saving') : t('button.saveDraft')}
          </Button>
        )}

        {!isNew && !isLocked && (
          <Button
            type="button"
            variant="default"
            onClick={handleFinalize}
            disabled={isSaving}
            className='bg-card'
          >
            {isFinalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            {isFinalizing ? t('button.issuing') : t('button.issueInvoice')}
          </Button>
        )}

        {isLocked && (
          <Badge variant="outline" className="text-muted-foreground border-green-500 text-green-600 bg-card" >
            <Lock className="w-4 h-4 mr-2" />
            {t('status.Sent')}
          </Badge>
        )}
      </div>
    </div>
  );
}