"use client";

import React from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, Save, Settings2, Eye, ArrowLeft, Lock, CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { type InvoiceDetail } from '@/types/finances'; // Encara el necessitem per 'initialData'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  DialogFooter, DialogClose
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import { InvoicePreview } from '../InvoicePreview'; // Ajusta la ruta si 'InvoicePreview' no està al mateix directori
import { type CompanyProfile } from '@/types/settings/team';
import { type Database } from '@/types/supabase';

// ✅ Importem el hook per agafar-ne els tipus
import { useInvoiceDetail } from '../../_hooks/useInvoiceDetail';

type Contact = Database['public']['Tables']['contacts']['Row'];

// ✅ Extraiem els tipus de retorn del hook
type UseInvoiceDetailReturn = ReturnType<typeof useInvoiceDetail>;

const InvoiceDownloadButton = dynamic(
  () => import('../PDF/InvoiceDownloadButton').then(mod => mod.InvoiceDownloadButton), // Ajusta la ruta
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

interface InvoiceDetailHeaderProps {
  handleBack: () => void;
  title: string;
  description: string;
  t: UseInvoiceDetailReturn['t']; // ✅ Tipus corregit
  formIsDisabled: boolean;
  formData: UseInvoiceDetailReturn['formData']; // ✅ Tipus corregit
  handleFieldChange: UseInvoiceDetailReturn['handleFieldChange']; // ✅ Tipus corregit
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
}: InvoiceDetailHeaderProps) {
  return (
    <div className="flex justify-between items-center gap-4 sticky top-[--header-height] bg-background  z-10 border-b px-4 md:px-0 -mx-4 md:-mx-0 sm:-mx-6 ">
      {/* Part Esquerra */}
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleBack}
          aria-label={t('button.goBack')}
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
            <Button variant="outline" size="icon" disabled={formIsDisabled}>
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
            <Button type="button" variant="outline" disabled={isSaving}>
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

        {formData.status !== 'Draft' && initialData && company && contact && (
          <InvoiceDownloadButton
            invoice={initialData}
            company={company}
            contact={contact}
          />)}

        {!isLocked && (
          <Button type="submit" disabled={isSaving}>
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
          >
            {isFinalizing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            {isFinalizing ? t('button.issuing') : t('button.issueInvoice')}
          </Button>
        )}

        {isLocked && (
          <Badge variant="outline" className="text-muted-foreground border-green-500 text-green-500">
            <Lock className="w-4 h-4 mr-2" />
            {t('status.Sent')}
          </Badge>
        )}
      </div>
    </div>
  );
}