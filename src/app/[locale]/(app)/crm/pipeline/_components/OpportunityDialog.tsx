"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, ChevronsUpDown, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ca, es, enUS } from "date-fns/locale";
import { saveOpportunityAction } from '../actions';
import type { Opportunity, Contact, Stage } from '../page';
import { useLocale, useTranslations } from 'next-intl';
import { PIPELINE_STAGES_MAP } from '@/types/crm'; // ✅ Importem el nou mapa


// Definim les propietats que rep el diàleg des del seu component pare.
interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  stages: Stage[];
  onSuccess: () => void;
  opportunityToEdit: Partial<Opportunity> | null;
}

/**
 * Diàleg modal per crear o editar una oportunitat de venda.
 * Conté un formulari que s'envia a una Server Action.
 */
export function OpportunityDialog({ open, onOpenChange, contacts, stages, onSuccess, opportunityToEdit }: OpportunityDialogProps) {
  const [isPending, startTransition] = useTransition(); // Hook per a l'estat de càrrega.
  const t = useTranslations('OpportunityDialog');
  const statePipline = useTranslations('PipelinePage');

  const locale = useLocale();
  // Estats locals per a camps que requereixen una gestió especial, com el selector de contacte i el calendari.
  const [selectedContactId, setSelectedContactId] = useState(opportunityToEdit?.contact_id || '');
  const [closeDate, setCloseDate] = useState<Date | undefined>(
    opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined
  );

  /**
   * 'useEffect' per resetejar els estats del formulari cada cop que s'obre el diàleg.
   * Això assegura que les dades d'una edició anterior no es mantinguin en crear una nova oportunitat.
   */
  useEffect(() => {
    if (open) {
      setSelectedContactId(opportunityToEdit?.contact_id || '');
      setCloseDate(opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined);
    }
  }, [open, opportunityToEdit]);

  const getDateLocale = () => {
    switch (locale) {
      case 'es': return es;
      case 'en': return enUS;
      default: return ca;
    }
  };
  /**
   * Gestiona l'enviament del formulari.
   * Recull les dades, les prepara i les envia a la Server Action 'saveOpportunityAction'.
   */
  const handleSubmit = (formData: FormData) => {
    // Afegim al 'formData' les dades que gestionem amb estats locals.
    if (opportunityToEdit?.id) {
      formData.set('id', opportunityToEdit.id);
    }
    formData.set('contact_id', selectedContactId);
    if (closeDate) {
      formData.set('close_date', closeDate.toISOString());
    } else {
      formData.delete('close_date');
    }

    startTransition(async () => {
      const result = await saveOpportunityAction(formData);
      if (result.error) {
        toast.error(t('toastErrorTitle'), { description: result.error.message });
      } else {
        toast.success(t('toastSuccessTitle'), { description: t('toastSuccessDescription') });
        onSuccess(); // Cridem la funció de callback per notificar al pare (ex: refrescar dades).
        onOpenChange(false); // Tanquem el diàleg.
      }
    });
  };

  // Trobem el contacte seleccionat per mostrar el seu nom al botó del Popover.
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle>{opportunityToEdit?.id ? t('editTitle') : t('newTitle')}</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="grid gap-4 pt-4">
          <Input name="name" placeholder={t('namePlaceholder')} defaultValue={opportunityToEdit?.name || ''} required />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between ...">
                {selectedContact ? selectedContact.nom : t('selectContactPlaceholder')}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect">
              <Command>
                <CommandInput placeholder={t('searchContactPlaceholder')} />
                <CommandList>
                  <CommandEmpty>{t('noContactFound')}</CommandEmpty>
                  <CommandGroup>
                    {contacts.map(contact => (
                      <CommandItem key={contact.id} value={contact.nom} onSelect={() => setSelectedContactId(contact.id)}>
                        {/* ✅ CORRECCIÓ: Embolcallem els dos fills en un <div> */}
                        <div className="flex items-center">
                          <Check className={cn("mr-2 h-4 w-4", selectedContactId === contact.id ? "opacity-100" : "opacity-0")} />
                          {contact.nom}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          {/* ✅ CORRECCIÓ: Utilitzem el mapa per al desplegable d'etapes */}
          <Select name="stage_name" defaultValue={opportunityToEdit?.stage_name || stages[0]?.name}>
            <SelectTrigger><SelectValue placeholder={t('selectStagePlaceholder')} /></SelectTrigger>
            <SelectContent className="glass-effect">
              {PIPELINE_STAGES_MAP.map(stage => (
                <SelectItem key={stage.key} value={stage.name}>
                  {statePipline(`stageNames.${stage.key}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 gap-4">
            <div><Label>{t('valueLabel')}</Label><Input name="value" type="number" step="0.01" placeholder="0.00" defaultValue={opportunityToEdit?.value || ''} /></div>
            <div><Label>{t('closeDateLabel')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full ...", !closeDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {closeDate ? format(closeDate, "PPP", { locale: getDateLocale() }) : <span>{t('pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={closeDate} onSelect={setCloseDate} /></PopoverContent>
              </Popover>
            </div>
          </div>
          <Textarea name="description" placeholder={t('descriptionPlaceholder')} defaultValue={opportunityToEdit?.description || ''} />
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t('cancelButton')}</Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('saveButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}