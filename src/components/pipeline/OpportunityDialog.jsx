// Fitxer: src/components/pipeline/OpportunityDialog.jsx

// CORRECCIÓ: Assegurem que 'useEffect' està importat aquí
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/customSupabaseClient';
import { useAuth } from '@/contexts/SupabaseAuthContext';
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
import { Check, ChevronsUpDown, Calendar as CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ca } from "date-fns/locale";

const OpportunityDialog = ({ open, onOpenChange, contacts, stages, onSuccess, opportunityToEdit }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const isEditMode = Boolean(opportunityToEdit);

  const initialState = { name: '', value: '', close_date: null, stage_name: stages[0]?.name || '', contact_id: null, description: '', source: '' };
  
  const [opportunityData, setOpportunityData] = useState(initialState);
  const [selectedContact, setSelectedContact] = useState(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);

  useEffect(() => {
    if (open) {
      if (isEditMode) {
        setOpportunityData({
            ...opportunityToEdit,
            close_date: opportunityToEdit.close_date ? new Date(opportunityToEdit.close_date) : null
        });
        const contact = contacts.find(c => c.id === opportunityToEdit.contact_id);
        setSelectedContact(contact || null);
      } else {
        setOpportunityData(initialState);
        setSelectedContact(null);
      }
    }
  }, [open, opportunityToEdit, isEditMode, contacts, stages]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setOpportunityData(prev => ({ ...prev, [name]: value }));
  };

  const handleStageChange = (value) => {
    setOpportunityData(prev => ({ ...prev, stage_name: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!opportunityData.name || !opportunityData.contact_id) {
      toast({ variant: 'destructive', title: 'Error', description: 'El nom i el contacte són obligatoris.' });
      return;
    }

    const dataToSave = { 
        ...opportunityData, 
        value: parseFloat(opportunityData.value) || 0,
        user_id: user.id 
    };
    
    delete dataToSave.contacts;

    if (isEditMode) {
      const { error } = await supabase.from('opportunities')
          .update(dataToSave)
          .eq('id', opportunityToEdit.id);
      
      if (error) { toast({ variant: 'destructive', title: 'Error en actualitzar', description: error.message }); } 
      else {
        toast({ title: 'Èxit!', description: "L'oportunitat s'ha actualitzat correctament." });
        onSuccess();
        onOpenChange(false);
      }
    } else {
      const { error } = await supabase.from('opportunities').insert(dataToSave);

      if (error) { toast({ variant: 'destructive', title: 'Error en desar', description: error.message }); } 
      else {
        toast({ title: 'Èxit!', description: "L'oportunitat s'ha creat correctament." });
        onSuccess();
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect text-white">
        <DialogHeader><DialogTitle className="text-2xl">{isEditMode ? 'Editar Oportunitat' : 'Crear Nova Oportunitat'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSave} className="grid gap-4 pt-4">
          <Input name="name" placeholder="Nom de l'oportunitat..." value={opportunityData.name} onChange={handleInputChange} className="search-input" required />
          <Textarea name="description" placeholder="Descripció i notes..." value={opportunityData.description} onChange={handleInputChange} className="search-input bg-transparent" />
          
          <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}><PopoverTrigger asChild>
            <Button variant="outline" role="combobox" className="w-full justify-between search-input text-left font-normal">
              {selectedContact ? selectedContact.nom : "Selecciona un contacte..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger><PopoverContent className="w-[--radix-popover-trigger-width] p-0 glass-effect"><Command>
            <CommandInput placeholder="Buscar client..." /><CommandList><CommandEmpty>No s'ha trobat cap client.</CommandEmpty><CommandGroup>
              {contacts.map((contact) => (<CommandItem key={contact.id} value={contact.nom} onSelect={() => { setSelectedContact(contact); setOpportunityData(p => ({...p, contact_id: contact.id})); setComboboxOpen(false); }}>
                  <Check className={cn("mr-2 h-4 w-4", opportunityData.contact_id === contact.id ? "opacity-100" : "opacity-0")} />{contact.nom}
              </CommandItem>))}
            </CommandGroup></CommandList></Command>
          </PopoverContent></Popover>

          <div className="space-y-2">
            <Label>Etapa</Label>
            <Select onValueChange={handleStageChange} value={opportunityData.stage_name}>
              <SelectTrigger className="w-full search-input"><SelectValue placeholder="Selecciona una etapa" /></SelectTrigger>
              <SelectContent className="glass-effect">
                {stages.map(stage => (<SelectItem key={stage.id} value={stage.name}>{stage.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Valor (€)</Label><Input name="value" type="number" step="0.01" placeholder="0.00" value={opportunityData.value} onChange={handleInputChange} className="search-input" /></div>
            <div className="space-y-2"><Label>Data de Tancament (Est.)</Label><Popover>
                <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal search-input", !opportunityData.close_date && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />{opportunityData.close_date ? format(opportunityData.close_date, "PPP", { locale: ca }) : <span>Tria una data</span>}
                </Button></PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={opportunityData.close_date} onSelect={(date) => setOpportunityData(p => ({...p, close_date: date}))} /></PopoverContent>
            </Popover></div>
          </div>

          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="ghost">Cancel·lar</Button></DialogClose>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700">{isEditMode ? 'Desar Canvis' : 'Crear Oportunitat'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default OpportunityDialog;