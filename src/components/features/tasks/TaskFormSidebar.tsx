// src/components/features/tasks/TaskFormSidebar.tsx

'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { Tables } from '@/types/supabase';
import {
  Calendar as CalendarIcon,
  Flag,
  User,
  Check,
  ChevronsUpDown,
  Building,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils/utils';
import { EnrichedTask } from './TaskDialogManager';

// --- Subcomponents interns de la Sidebar ---

interface DueDatePopoverProps {
  date: Date | undefined;
  onDateChange: (date: Date | undefined) => void;
}
function DueDatePopover({ date, onDateChange }: DueDatePopoverProps) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <CalendarIcon className="w-4 h-4" />
        Data de venciment
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant={'outline'}
            className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
          >
            {date ? format(date, 'PPP', { locale: es }) : <span>Selecciona una data</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar mode="single" selected={date} onSelect={onDateChange} autoFocus />
        </PopoverContent>
      </Popover>
      <input type="hidden" name="due_date" value={date ? date.toISOString() : ''} />
    </div>
  );
}

interface TeamMemberComboboxProps {
  assignedUserId: string | null;
  onAssignedUserChange: (id: string | null) => void;
  teamMembers: { id: string; full_name: string | null }[];
}
function TeamMemberCombobox({ assignedUserId, onAssignedUserChange, teamMembers }: TeamMemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedMember = teamMembers.find((m) => m.id === assignedUserId);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <User className="w-4 h-4" />
        Assignar a
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            {selectedMember ? selectedMember.full_name : 'Selecciona un membre'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Cercar membre..." />
            <CommandList>
              <CommandEmpty>No s'ha trobat cap membre.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onAssignedUserChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', !assignedUserId ? 'opacity-100' : 'opacity-0')} />
                  Sense assignar
                </CommandItem>
                {teamMembers.map((user) => (
                  <CommandItem
                    key={user.id}
                    value={user.full_name ?? ''}
                    onSelect={() => {
                      onAssignedUserChange(user.id);
                      setOpen(false);
                    }}
                  >
                    <Check className={cn('mr-2 h-4 w-4', assignedUserId === user.id ? 'opacity-100' : 'opacity-0')} />
                    {user.full_name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        <input type="hidden" name="user_asign_id" value={assignedUserId ?? 'none'} />
      </Popover>
    </div>
  );
}

interface ContactComboboxProps {
  selectedContactId: string | null;
  onContactChange: (id: string | null) => void;
  contacts: Tables<'contacts'>[];
}
function ContactCombobox({ selectedContactId, onContactChange, contacts }: ContactComboboxProps) {
  const [open, setOpen] = useState(false);
  const selectedContact = contacts.find((c) => c.id.toString() === selectedContactId);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <User className="w-4 h-4" />
        Contacte associat
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
            {selectedContact ? selectedContact.nom : 'Selecciona un contacte'}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <Command>
            <CommandInput placeholder="Cercar contacte..." />
            <CommandList>
              <CommandEmpty>No s'ha trobat cap contacte.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onContactChange(null);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4', !selectedContactId ? 'opacity-100' : 'opacity-0')} />
                  Cap
                </CommandItem>
                {contacts.map((contact) => (
                  <CommandItem
                    key={contact.id}
                    value={contact.nom ?? ''}
                    onSelect={() => {
                      onContactChange(contact.id.toString());
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedContactId === contact.id.toString() ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {contact.nom}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        <input type="hidden" name="contact_id" value={selectedContactId ?? 'none'} />
      </Popover>
    </div>
  );
}

// --- Component Principal de la Sidebar ---

interface TaskFormSidebarProps {
  task: EnrichedTask | null;
  dueDate: Date | undefined;
  onDueDateChange: (date: Date | undefined) => void;
  contacts: Tables<'contacts'>[];
  selectedContactId: string | null;
  onContactChange: (id: string | null) => void;
  teamMembers: { id: string; full_name: string | null }[];
  assignedUserId: string | null;
  onAssignedUserChange: (id: string | null) => void;
  departments: Tables<'departments'>[];
}

export function TaskFormSidebar({
  task,
  dueDate,
  onDueDateChange,
  contacts,
  selectedContactId,
  onContactChange,
  teamMembers,
  assignedUserId,
  onAssignedUserChange,
  departments,
}: TaskFormSidebarProps) {
  return (
    <div className="lg:col-span-1 space-y-4 h-full overflow-y-auto pr-3 custom-scrollbar">
      <DueDatePopover date={dueDate} onDateChange={onDueDateChange} />

      <div className="space-y-2">
        <Label htmlFor="priority" className="flex items-center gap-2">
          <Flag className="w-4 h-4" />
          Prioritat
        </Label>
        <Select name="priority" defaultValue={task?.priority ?? 'Mitjana'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona una prioritat" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Baixa">Baixa</SelectItem>
            <SelectItem value="Mitjana">Mitjana</SelectItem>
            <SelectItem value="Alta">Alta</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="duration" className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Duració
        </Label>
        <Input
          id="duration"
          name="duration"
          type="number"
          step="0.01"
          placeholder="Hores (ex: 1.25)"
          defaultValue={task?.duration ?? ''}
        />
      </div>

      <TeamMemberCombobox
        assignedUserId={assignedUserId}
        onAssignedUserChange={onAssignedUserChange}
        teamMembers={teamMembers}
      />

      <div className="space-y-2">
        <Label htmlFor="assignment_date" className="flex items-center gap-2">
          <CalendarIcon className="w-4 h-4" />
          Data assignació
        </Label>
        <Input
          id="assignment_date"
          name="assignment_date"
          type="text"
          value={task?.asigned_date ? format(new Date(task.asigned_date), 'dd/MM/yyyy') : '-'}
          readOnly
          className="bg-muted/50 cursor-not-allowed"
        />
      </div>

      <ContactCombobox
        selectedContactId={selectedContactId}
        onContactChange={onContactChange}
        contacts={contacts}
      />

      <div className="space-y-2">
        <Label htmlFor="department_id" className="flex items-center gap-2">
          <Building className="w-4 h-4" />
          Departament
        </Label>
        <Select name="department_id" defaultValue={task?.department_id?.toString() ?? 'none'}>
          <SelectTrigger>
            <SelectValue placeholder="Selecciona un departament" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Cap</SelectItem>
            {departments.map((dep) => (
              <SelectItem key={dep.id} value={dep.id.toString()}>
                {dep.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}