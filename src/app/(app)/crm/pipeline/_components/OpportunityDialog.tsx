// Ruta del fitxer: src/app/(app)/crm/pipeline/_components/OpportunityDialog.tsx
"use client";

import React, { useState, useEffect, useTransition } from 'react';
import { toast } from 'sonner'; // ✅ 1. Importem 'toast' de sonner
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
import { ca } from "date-fns/locale";

import { saveOpportunityAction } from '../actions';
import type { Opportunity, Contact, Stage } from '../page';

interface OpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  stages: Stage[];
  onSuccess: () => void;
  opportunityToEdit: Partial<Opportunity> | null;
}

export function OpportunityDialog({ open, onOpenChange, contacts, stages, onSuccess, opportunityToEdit }: OpportunityDialogProps) {
  const [isPending, startTransition] = useTransition();
  
  const [selectedContactId, setSelectedContactId] = useState(opportunityToEdit?.contact_id || '');
  const [closeDate, setCloseDate] = useState<Date | undefined>(
    opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined
  );

  useEffect(() => {
    // Resetejem els estats interns quan el diàleg s'obre amb una nova oportunitat
    if (open) {
      setSelectedContactId(opportunityToEdit?.contact_id || '');
      setCloseDate(opportunityToEdit?.close_date ? new Date(opportunityToEdit.close_date) : undefined);
    }
  }, [open, opportunityToEdit]);


  const handleSubmit = (formData: FormData) => {
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
        toast.error('Error', { description: result.error.message });
      } else {
        toast.success('Èxit!', { description: "L'oportunitat s'ha desat correctament." });
        onSuccess();
        onOpenChange(false);
      }
    });
  };
  
  const selectedContact = contacts.find(c => c.id === selectedContactId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect">
        <DialogHeader><DialogTitle>{opportunityToEdit?.id ? 'Editar Oportunitat' : 'Nova Oportunitat'}</DialogTitle></DialogHeader>
        <form action={handleSubmit} className="grid gap-4 pt-4">
          <Input name="name" placeholder="Nom de l'oportunitat..." defaultValue={opportunityToEdit?.name || ''} required />
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal">
                {selectedContact ? selectedContact.nom : "Selecciona un contacte..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect">
              <Command>
                <CommandInput placeholder="Buscar contacte..." />
                <CommandList>
                  <CommandEmpty>No s'ha trobat cap contacte.</CommandEmpty>
                  <CommandGroup>
                    {contacts.map(contact => (
                      <CommandItem key={contact.id} value={contact.nom} onSelect={() => setSelectedContactId(contact.id)}>
                         <Check className={cn("mr-2 h-4 w-4", selectedContactId === contact.id ? "opacity-100" : "opacity-0")} />
                         {contact.nom}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Select name="stage_name" defaultValue={opportunityToEdit?.stage_name || stages[0]?.name}>
            <SelectTrigger><SelectValue placeholder="Selecciona una etapa" /></SelectTrigger>
            <SelectContent className="glass-effect">
              {stages.map(stage => (<SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>))}
            </SelectContent>
          </Select>
          
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Valor (€)</Label><Input name="value" type="number" step="0.01" placeholder="0.00" defaultValue={opportunityToEdit?.value || ''} /></div>
            <div><Label>Data de Tancament</Label>
              <Popover>
                <PopoverTrigger asChild>
                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !closeDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {closeDate ? format(closeDate, "PPP", { locale: ca }) : <span>Tria una data</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={closeDate} onSelect={setCloseDate} className={undefined} classNames={undefined} formatters={undefined} components={undefined} /></PopoverContent>
              </Popover>
            </div>
          </div>
          <Textarea name="description" placeholder="Descripció i notes..." defaultValue={opportunityToEdit?.description || ''} />

          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel·lar</Button>
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

