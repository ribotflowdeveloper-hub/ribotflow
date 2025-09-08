"use client";

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
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
import { ca } from "date-fns/locale";
import { saveOpportunityAction } from './opportunity-actions';
import type { Opportunity, Contact, Stage } from '../page';

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  stages: Stage[];
  onSuccess: () => void;
  opportunityToEdit: Opportunity | null;
}

export default function OpportunityDialog({ open, onOpenChange, contacts, stages, onSuccess, opportunityToEdit }: OpportunityDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const formKey = useMemo(() => opportunityToEdit?.id || 'new', [opportunityToEdit]);

  const handleSubmit = (formData: FormData) => {
    // Afegim l'ID al formData si estem editant
    if (opportunityToEdit) {
      formData.set('id', opportunityToEdit.id);
    }

    startTransition(async () => {
      const result = await saveOpportunityAction(formData);
      if (result.error) {
        toast({ variant: 'destructive', title: 'Error', description: result.error.message });
      } else {
        toast({ title: 'Èxit!', description: "L'oportunitat s'ha desat correctament." });
        onSuccess();
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle>{opportunityToEdit ? 'Editar Oportunitat' : 'Nova Oportunitat'}</DialogTitle></DialogHeader>
        <form key={formKey} action={handleSubmit} className="grid gap-4 pt-4">
          <Input name="name" placeholder="Nom de l'oportunitat..." defaultValue={opportunityToEdit?.name || ''} required />
          <Textarea name="description" placeholder="Descripció i notes..." defaultValue={opportunityToEdit?.description || ''} />
          <input type="hidden" name="contact_id" value={opportunityToEdit?.contact_id || ''} />

          <Select name="stage_name" defaultValue={opportunityToEdit?.stage_name || stages[0]?.name}>
            <SelectTrigger><SelectValue placeholder="Selecciona una etapa" /></SelectTrigger>
            <SelectContent className="glass-effect">
              {stages.map(stage => (<SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>))}
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Valor (€)</Label><Input name="value" type="number" step="0.01" placeholder="0.00" defaultValue={opportunityToEdit?.value || 0} /></div>
            <div><Label>Data de Tancament</Label>
              <Popover>
                {/* Aquest component de data necessita ser gestionat amb estat per a la UI */}
                <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !opportunityToEdit?.close_date && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{opportunityToEdit?.close_date ? format(new Date(opportunityToEdit.close_date), "PPP", { locale: ca }) : <span>Tria una data</span>}</Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar name="close_date" mode="single" selected={opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined} className={undefined} classNames={undefined} formatters={undefined} components={undefined} /></PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="ghost">Cancel·lar</Button></DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Desar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}