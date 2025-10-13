"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandGroup, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, ListTodo, User } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useAddTask } from "../_hooks/useAddTask";
import { Tables } from "@/types/supabase"; // ✅ CORRECCIÓ #1: Importem el tipus de Supabase

// ✅ CORRECCIÓ #2: Eliminem el tipus local 'Contact'
// type Contact = { id: string; nom: string };

interface AddTaskDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // ✅ CORRECCIÓ #3: Utilitzem el tipus correcte per als contactes
  contacts: Tables<"contacts">[];
  onTaskCreated?: () => void;
}

export default function AddTaskDialog({
  open,
  onOpenChange,
  contacts,
  onTaskCreated,
}: AddTaskDialogProps) {
  const t = useTranslations("DashboardClient.addTaskDialog");
  const [title, setTitle] = useState("");
  const [comboboxOpen, setComboboxOpen] = useState(false);
  
  // Assegurem-nos que el hook 'useAddTask' també entén el nou tipus
  const { addTask, isPending, selectedContact, setSelectedContact } = useAddTask({ onTaskCreated });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addTask(title);
    setTitle("");
    setSelectedContact(null);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-6 pt-4">
          {/* Input de títol */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2">
              <ListTodo className="w-4 h-4" /> {t("taskTitleLabel")}
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("taskTitlePlaceholder")}
              required
            />
          </div>

          {/* Selecció de contacte */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <User className="w-4 h-4" /> {t("assignContactLabel")}
            </Label>

            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between font-normal"
                >
                  {selectedContact
                    ? selectedContact.nom
                    : t("selectContactPlaceholder")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder={t("searchContactPlaceholder")} />
                  <CommandList>
                    <CommandEmpty>{t("noContactFound")}</CommandEmpty>
                    <CommandGroup>
                      {contacts.map((contact) => (
                        <CommandItem
                          key={contact.id} // React accepta 'number' com a key sense problemes
                          value={contact.nom} // 'value' ha de ser un string, 'nom' ho és
                          onSelect={() => {
                            setSelectedContact({ ...contact, id: String(contact.id) });
                            setComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedContact?.id === String(contact.id)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          {contact.nom}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Footer */}
          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t("cancelButton")}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("savingButton") : t("saveButton")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}