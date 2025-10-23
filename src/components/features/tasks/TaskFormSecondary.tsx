// src/components/features/tasks/TaskFormSecondary.tsx
'use client';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils/utils';
import { Tables } from '@/types/supabase';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Building, Calendar as CalendarIcon, Check, ChevronsUpDown, Clock, Flag, User } from 'lucide-react';

// Props del hook
interface StateFromHook {
  dueDate: Date | undefined;
  selectedContactId: string | null;
  assignedUserId: string | null;
  contactComboboxOpen: boolean;
  teamMemberComboboxOpen: boolean;
}
// Handlers del hook
interface HandlersFromHook {
  setDueDate: (date: Date | undefined) => void;
  setSelectedContactId: (id: string | null) => void;
  setAssignedUserId: (id: string | null) => void;
  setContactComboboxOpen: (open: boolean) => void;
  setTeamMemberComboboxOpen: (open: boolean) => void;
}
// Valors inicials (per camps no controlats)
interface InitialValues {
  priority: string;
  duration: string | number;
  departmentId: string;
  assignmentDate: string;
}
// Props estàtiques
interface StaticProps {
  contacts: Tables<'contacts'>[];
  teamMembers: { id: string; full_name: string | null }[];
  departments: Tables<'departments'>[];
}

// Props completes del component
type TaskFormSecondaryProps = {
  state: StateFromHook;
  handlers: HandlersFromHook;
  initialValues: InitialValues;
} & StaticProps;

export function TaskFormSecondary({
  state,
  handlers,
  initialValues,
  contacts,
  teamMembers,
  departments
}: TaskFormSecondaryProps) {

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20 h-full">
      
      {/* Data Venciment */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" />Data de venciment</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !state.dueDate && "text-muted-foreground")}>
              {state.dueDate ? format(state.dueDate, "PPP", { locale: es }) : <span>Selecciona una data</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={state.dueDate} onSelect={handlers.setDueDate} initialFocus /></PopoverContent>
        </Popover>
      </div>

      {/* Prioritat */}
      <div className="space-y-2">
        <Label htmlFor="priority" className="flex items-center gap-2"><Flag className="w-4 h-4" />Prioritat</Label>
        <Select name="priority" defaultValue={initialValues.priority}>
          <SelectTrigger><SelectValue placeholder="Selecciona una prioritat" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Mitjana">Mitjana</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Assignar a */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><User className="w-4 h-4" />Assignar a</Label>
        <Popover open={state.teamMemberComboboxOpen} onOpenChange={handlers.setTeamMemberComboboxOpen}>
          <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between font-normal">{state.assignedUserId ? (teamMembers.find(m => m.id === state.assignedUserId)?.full_name ?? 'Membre no trobat') : "Selecciona un membre"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Cercar membre..." />
              <CommandList><CommandEmpty>No s'ha trobat cap membre.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => { handlers.setAssignedUserId(null); handlers.setTeamMemberComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", !state.assignedUserId ? "opacity-100" : "opacity-0")} />Sense assignar</CommandItem>
                  {teamMembers.map((user) => (<CommandItem key={user.id} value={user.full_name ?? ''} onSelect={() => { handlers.setAssignedUserId(user.id); handlers.setTeamMemberComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", state.assignedUserId === user.id ? "opacity-100" : "opacity-0")} />{user.full_name}</CommandItem>))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {/* Input ocult gestionat pel hook */}
      </div>

      {/* Contacte Associat */}
      <div className="space-y-2">
        <Label className="flex items-center gap-2"><User className="w-4 h-4" />Contacte associat</Label>
        <Popover open={state.contactComboboxOpen} onOpenChange={handlers.setContactComboboxOpen}>
          <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between font-normal">{state.selectedContactId ? (contacts.find(c => c.id.toString() === state.selectedContactId)?.nom ?? 'Contacte no trobat') : "Selecciona un contacte"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
            <Command>
              <CommandInput placeholder="Cercar contacte..." />
              <CommandList><CommandEmpty>No s'ha trobat cap contacte.</CommandEmpty>
                <CommandGroup>
                  <CommandItem onSelect={() => { handlers.setSelectedContactId(null); handlers.setContactComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", !state.selectedContactId ? "opacity-100" : "opacity-0")} />Cap</CommandItem>
                  {contacts.map((contact) => (<CommandItem key={contact.id} value={contact.nom ?? ''} onSelect={() => { handlers.setSelectedContactId(contact.id.toString()); handlers.setContactComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", state.selectedContactId === contact.id.toString() ? "opacity-100" : "opacity-0")} />{contact.nom}</CommandItem>))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {/* Input ocult gestionat pel hook */}
      </div>
      
      {/* Departament */}
      <div className="space-y-2">
        <Label htmlFor="department_id" className="flex items-center gap-2"><Building className="w-4 h-4" />Departament</Label>
        <Select name="department_id" defaultValue={initialValues.departmentId}>
          <SelectTrigger><SelectValue placeholder="Selecciona un departament" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Cap</SelectItem>
            {departments.map(dep => (
              <SelectItem key={dep.id} value={dep.id.toString()}>{dep.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Duració */}
      <div className="space-y-2">
        <Label htmlFor="duration" className="flex items-center gap-2"><Clock className="w-4 h-4" />Duració (Hores)</Label>
        <Input id="duration" name="duration" type="number" step="0.01" placeholder="Ex: 1.25" defaultValue={initialValues.duration} />
      </div>

      {/* Data Assignació (Read Only) */}
      <div className="space-y-2">
        <Label htmlFor="assignment_date" className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" />Data assignació</Label>
        <Input id="assignment_date" name="assignment_date" type="text" value={initialValues.assignmentDate} readOnly className="bg-muted/50 cursor-not-allowed" />
      </div>

    </div>
  );
}