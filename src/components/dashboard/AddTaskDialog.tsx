/**
 * @file AddTaskDialog.tsx
 * @summary Aquest fitxer defineix un component de client reutilitzable que mostra un diàleg
 * per crear una nova tasca. Gestiona l'estat del formulari i, en aquest cas,
 * interactua directament amb el client de Supabase per a la inserció de dades.
 */

"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ListTodo, User } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { FC } from 'react';

// Tipus per a les dades dels contactes que es mostren al selector.
type Contact = { id: string; nom: string; };

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onTaskCreated: () => void; // Callback per notificar al pare que s'ha creat una tasca.
}

const AddTaskDialog: FC<AddTaskDialogProps> = ({ open, onOpenChange, contacts, onTaskCreated }) => {

  const supabase = createClient();
  
  // Gestió de l'estat del formulari.
  const [title, setTitle] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false); // Estat per al popover del selector de contactes.
  const [isSaving, setIsSaving] = useState(false);

  /**
   * @summary Gestor per desar la nova tasca.
   * A diferència d'altres formularis, aquest utilitza el client de Supabase directament
   * en lloc d'una Server Action. Això pot ser adequat per a operacions simples que no
   * requereixen lògica de negoci complexa al servidor.
   */
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Error', { description: 'El títol de la tasca no pot estar buit.' });
      return;
    }

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser(); // Obtenim l'usuari actual de la sessió del client.

    if (!user) {
      toast.error('Error', { description: 'Usuari no autenticat.' });
      setIsSaving(false);
      return;
    }
    
    // Inserim el nou registre a la taula 'tasks'.
    const { error } = await supabase.from('tasks').insert({
      title,
      contact_id: selectedContact?.id || null, // Assignem l'ID del contacte si se n'ha seleccionat un.
      user_id: user.id,
    });
    
    setIsSaving(false);

    if (error) {
      toast.error('Error en desar la tasca', { description: error.message });
    } else {
      toast.success('Èxit!', { description: 'La tasca s\'ha creat correctament.' });
      onTaskCreated(); // Cridem al callback per refrescar la llista de tasques a la UI.
      
      // Resetejem l'estat del formulari i tanquem el diàleg.
      setTitle('');
      setSelectedContact(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-effect text-foreground">
        <DialogHeader>
          <DialogTitle className="text-2xl">Crear Nova Tasca</DialogTitle>
          <DialogDescription>Afegeix una nova tasca al teu dia a dia. Pots assignar-la a un contacte si vols.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveTask} className="grid gap-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2"><ListTodo className="w-4 h-4" />Títol de la Tasca</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Fer seguiment..." className="search-input" required />
          </div>
          {/* Selector de contactes amb cerca, implementat amb Popover i Command de shadcn/ui. */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="w-4 h-4" />Assignar a Contacte (Opcional)</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
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
                      {contacts.map((contact) => (
                        <CommandItem key={contact.id} value={contact.nom} onSelect={() => {
                          setSelectedContact(contact);
                          setComboboxOpen(false);
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedContact?.id === contact.id ? "opacity-100" : "opacity-0")} />
                          {contact.nom}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter className="pt-4">
            <DialogClose asChild><Button type="button" variant="ghost">Cancel·lar</Button></DialogClose>
            <Button type="submit" disabled={isSaving} className="bg-purple-600 hover:bg-purple-700">
              {isSaving ? 'Desant...' : 'Desar Tasca'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;
