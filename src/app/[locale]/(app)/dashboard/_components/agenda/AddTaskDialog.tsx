"use client";

import React, { useState, useEffect, useTransition } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandGroup, CommandInput, CommandItem, CommandList, CommandEmpty } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Check, ChevronsUpDown, ListTodo, User, Calendar as CalendarIcon, Flag, AlignLeft, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import { useTranslations } from "next-intl";
import { useAddTask } from "../../_hooks/useAddTask";
import { Tables } from "@/types/supabase";
import { TaskPriority, NewTaskPayload } from "@/types/dashboard/types"; // ✅ Importem els nostres tipus centralitzats
import { addDepartment as addDepartmentAction } from '../../actions'; // ✅ Importem la nova acció
import { toast } from "sonner";
import { AlertDialog,AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle} from "@/components/ui/alert-dialog";

// Les prioritats per al menú desplegable
const priorities: TaskPriority[] = ["Baixa", "Mitjana", "Alta"];

interface AddTaskDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contacts: Tables<"contacts">[];
  onTaskCreated?: () => void;
  departments: Tables<'departments'>[];

}

export default function AddTaskDialog({
  open,
  onOpenChange,
  contacts,
  onTaskCreated,
  departments, // ✅ CORRECCIÓ: Afegeix 'departments' aquí

}: AddTaskDialogProps) {
  const t = useTranslations("DashboardClient.addTaskDialog");
  const [isPendingAction, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [comboboxOpen, setComboboxOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState<number | null>(null);


  // ✅ NOU: Estat local per a la llista de departaments (per a actualització optimista)
  const [localDepartments, setLocalDepartments] = useState(departments);
  const [newDepartmentName, setNewDepartmentName] = useState("");
  const [isCreateDeptOpen, setCreateDeptOpen] = useState(false);

  // Sincronitzem l'estat local si les props canvien
  useEffect(() => {
    setLocalDepartments(departments);
  }, [departments]);

  const { addTask, isPending, selectedContact, setSelectedContact } = useAddTask({ onTaskCreated });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTitle(""); setDescription(""); setDueDate(undefined); setPriority(null); setSelectedContact(null);
    }
    onOpenChange?.(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const taskData: Omit<NewTaskPayload, 'contact_id'> = {
      title,
      description: description || null,
      due_date: dueDate ? dueDate.toISOString() : null,
      priority,
      department_id: departmentId,

    };
    addTask(taskData);
    handleOpenChange(false);
  };
  // ✅ NOU: Funció per gestionar la creació del departament
  const handleCreateDepartment = () => {
    if (!newDepartmentName.trim()) return;

    startTransition(async () => {
      const result = await addDepartmentAction(newDepartmentName);
      if (result.error) {
        toast.error("Error", { description: result.error.message });
      } else if (result.data) {
        toast.success(`Departament "${result.data.name}" creat`);
        // Actualització optimista: afegim el nou departament a la llista local
        setLocalDepartments(current => [...current, result.data]);
        // I el seleccionem automàticament
        setDepartmentId(result.data.id);
        setCreateDeptOpen(false);
        setNewDepartmentName("");
      }
    });
  };
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2"><ListTodo className="w-4 h-4" />{t("taskTitleLabel")}</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t("taskTitlePlaceholder")} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="flex items-center gap-2"><AlignLeft className="w-4 h-4" />{t("descriptionLabel")}</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descriptionPlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label>Departament</Label>
            <Select onValueChange={(value) => setDepartmentId(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un departament" />
              </SelectTrigger>
              <SelectContent>
                {localDepartments.map(dep => (
                  <SelectItem key={dep.id} value={String(dep.id)}>{dep.name}</SelectItem>
                ))}
                {/* ✅ NOU: Botó per crear un departament */}
                <div
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none text-primary hover:bg-accent"
                  onSelect={(e) => e.preventDefault()} // Evita que es tanqui el Select
                  onClick={() => setCreateDeptOpen(true)}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  {t("crearNewDepartment")}
                </div>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" />{t("dueDateLabel")}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>
                    {dueDate ? format(dueDate, "PPP", { locale: es }) : <span>{t("dueDatePlaceholder")}</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} initialFocus /></PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Flag className="w-4 h-4" />{t("priorityLabel")}</Label>
              <Select onValueChange={(value: TaskPriority) => setPriority(value)}>
                <SelectTrigger><SelectValue placeholder={t("priorityPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {priorities.map(p => (
                    <SelectItem key={p} value={p}>{t(`priority.${p.toLowerCase()}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><User className="w-4 h-4" /> {t("assignContactLabel")}</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedContact ? selectedContact.nom : t("selectContactPlaceholder")}
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
                        <CommandItem key={contact.id} value={contact.nom} onSelect={() => { setSelectedContact(contact); setComboboxOpen(false); }}>
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
            <DialogClose asChild><Button type="button" variant="ghost">{t("cancelButton")}</Button></DialogClose>
            <Button type="submit" disabled={isPending}>{isPending ? t("savingButton") : t("saveButton")}</Button>
          </DialogFooter>
        </form>
         {/* ✅ NOU: Diàleg de confirmació per crear el departament */}
        <AlertDialog open={isCreateDeptOpen} onOpenChange={setCreateDeptOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Crear Nou Departament</AlertDialogTitle>
              <AlertDialogDescription>
                Introdueix el nom del nou departament que vols afegir.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input 
              placeholder="Ex: Disseny Gràfic"
              value={newDepartmentName}
              onChange={(e) => setNewDepartmentName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleCreateDepartment(); }}}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
              <Button onClick={handleCreateDepartment} disabled={isPendingAction}>
                {isPendingAction ? "Creant..." : "Crear"}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}