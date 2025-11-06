import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ca, es, enUS } from "date-fns/locale";
import { format } from "date-fns";

import { type Database } from '@/types/supabase';
type Contact = Database['public']['Tables']['contacts']['Row'];

import { type Stage, type OpportunityWithContact } from './PipelineData';
// ❗ ELIMINAT: Ja no fem servir PIPELINE_STAGES_MAP per al formulari

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, // ✅ AFEGIT
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar as CalendarIcon, Loader2, Trash2 } from 'lucide-react'; // ✅ AFEGIT: Trash2
import { cn } from "@/lib/utils/utils";
import { useOpportunityForm } from '../_hooks/useOpportunityForm';
import { ContactSelector } from '@/components/features/contactes/ContactSelector';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  stages: Stage[]; // ✅ AQUESTA ÉS LA FONT DE LA VERITAT PER A LES ETAPES
  onSuccess: () => void;
  opportunityToEdit: Partial<OpportunityWithContact> | null;
}

export function OpportunityDialog({ open, onOpenChange, contacts, stages, onSuccess, opportunityToEdit }: Props) {
  const t = useTranslations('OpportunityDialog');
  const tCommon = useTranslations('OpportunityDialog.Common'); // Per als botons Eliminar/Cancel·lar
  const locale = useLocale();
  
  // ✅ 1. Obtenim la nova funció 'handleDelete'
  const { isPending, selectedContactId, setSelectedContactId, closeDate, setCloseDate, handleSubmit, handleDelete } = useOpportunityForm({
    opportunityToEdit,
    onSuccess,
    onOpenChange
  });

  const dateLocale = { ca, es, en: enUS }[locale] || ca;
  const isEditMode = !!opportunityToEdit?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? t('editTitle') : t('newTitle')}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="grid gap-4 pt-4">
          <Input name="name" placeholder={t('namePlaceholder')} defaultValue={opportunityToEdit?.name || ''} required />
          
          <ContactSelector contacts={contacts} selectedId={selectedContactId} onSelect={setSelectedContactId} />
          
          {/* ❗ GRFIX: Bug crític corregit aquí */}
          <Select
            // ✅ 1. El nom ha de ser 'pipeline_stage_id'
            name="pipeline_stage_id"
            // ✅ 2. El valor per defecte ha de ser l'ID numèric
            defaultValue={opportunityToEdit?.pipeline_stage_id?.toString()}
            required
          >
            <SelectTrigger><SelectValue placeholder={t('selectStagePlaceholder')} /></SelectTrigger>
            <SelectContent>
              {/* ✅ 3. Iterem sobre 'stages' (les etapes reals del pipeline), no sobre 'PIPELINE_STAGES_MAP' */}
              {stages.map(stage => (
                <SelectItem key={stage.id} value={stage.id.toString()}>
                  {stage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="value">{t('valueLabel')}</Label>
              <Input id="value" name="value" type="number" step="0.01" placeholder="0.00" defaultValue={opportunityToEdit?.value || ''} />
            </div>
            <div>
              <Label>{t('closeDateLabel')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !closeDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {closeDate ? format(closeDate, "PPP", { locale: dateLocale }) : <span>{t('pickDate')}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={closeDate} onSelect={setCloseDate} /></PopoverContent>
              </Popover>
            </div>
          </div>
          
          <Textarea name="description" placeholder={t('descriptionPlaceholder')} defaultValue={opportunityToEdit?.description || ''} />
          
          <DialogFooter className="pt-4 flex justify-between sm:justify-between">
            {/* ✅ AFEGIT: Botó d'eliminar (només en mode edició) */}
            {isEditMode ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="destructive" className="mr-auto" disabled={isPending}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {tCommon('delete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('confirmDeleteTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('confirmDeleteDescription', { name: opportunityToEdit.name ?? '' })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{tCommon('cancel')}</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={handleDelete} 
                      disabled={isPending}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {tCommon('deleteConfirmation')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <div></div> // Espaiador per mantenir els botons a la dreta
            )}

            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>{t('cancelButton')}</Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {t('saveButton')}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}