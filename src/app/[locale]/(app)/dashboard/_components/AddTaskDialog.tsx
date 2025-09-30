/**
 * @file AddTaskDialog.tsx
 * @summary Defineix el diàleg modal per crear una nova tasca.
 */
"use client";

import React, { useState, FC } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandGroup, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ListTodo, User } from 'lucide-react';
import { cn } from "@/lib/utils/utils";
import { useTranslations } from 'next-intl';

type Contact = { id: string; nom: string; };

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onTaskCreated: () => void;
}

const AddTaskDialog: FC<AddTaskDialogProps> = ({ open, onOpenChange, contacts, onTaskCreated }) => {
  const t = useTranslations('DashboardClient.addTaskDialog');
  const supabase = createClient()
;
  const [title, setTitle] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * @summary Gestor per desar la nova tasca.
   */
  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t('toast.errorTitle'), { description: t('toast.emptyTitle') });
      return;
    }

    setIsSaving(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error(t('toast.errorTitle'), { description: t('toast.unauthenticated') });
      setIsSaving(false);
      return;
    }
    
    const { error } = await supabase.from('tasks').insert({
      title,
      contact_id: selectedContact?.id || null,
      user_id: user.id,
    });
    
    setIsSaving(false);

    if (error) {
      toast.error(t('toast.saveError'), { description: error.message });
    } else {
      toast.success(t('toast.successTitle'), { description: t('toast.successDescription') });
      onTaskCreated();
      
      // Resetejem l'estat del formulari i tanquem el diàleg.
      setTitle('');
      setSelectedContact(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSaveTask} className="grid gap-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2"><ListTodo className="w-4 h-4" />{t('taskTitleLabel')}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('taskTitlePlaceholder')} required />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="w-4 h-4" />{t('assignContactLabel')}</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedContact ? selectedContact.nom : t('selectContactPlaceholder')}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t('searchContactPlaceholder')} />
                  <CommandList>
                    <CommandEmpty>{t('noContactFound')}</CommandEmpty>
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
            <DialogClose asChild><Button type="button" variant="ghost">{t('cancelButton')}</Button></DialogClose>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? t('savingButton') : t('saveButton')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddTaskDialog;