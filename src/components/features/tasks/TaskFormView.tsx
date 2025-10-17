// TaskFormView.tsx - Versió actualitzada

'use client';

import { useState, useTransition, FormEvent } from 'react';
import { DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import EditorWysiwyg from '@/components/ui/EditorWysiwyg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { createTask, updateTask } from '@/app/actions/tasks/actions';
import { EnrichedTask } from './TaskDialogManager';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { ArrowLeft, AlignLeft, Calendar as CalendarIcon, Flag, ListTodo, User, Check, ChevronsUpDown, Building, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '@/lib/utils/utils';

interface TaskFormViewProps {
    task: EnrichedTask | null;
    onSetViewMode: () => void;
    // ✅ CANVI: Actualitzem la definició per coincidir amb la nova lògica.
    onTaskMutation: (options?: { closeDialog?: boolean }) => void;
    contacts: Tables<'contacts'>[];
    departments: Tables<'departments'>[];
    teamMembers: { id: string; full_name: string | null }[];
    initialDate?: Date;
}

function FormActions({ isEditing, onSetViewMode, isPending }: { isEditing: boolean, onSetViewMode: () => void, isPending: boolean }) {
    return (
        <DialogFooter className="sm:justify-between mt-4 pt-4 border-t">
            <div>
                {isEditing && (
                    <Button type="button" variant="ghost" onClick={onSetViewMode} disabled={isPending}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Tornar a la vista
                    </Button>
                )}
            </div>
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={isPending}>Cancel·lar</Button>
                </DialogClose>
                <Button type="submit" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isPending
                        ? (isEditing ? 'Guardant...' : 'Creant...')
                        : (isEditing ? 'Guardar Canvis' : 'Crear Tasca')}
                </Button>
            </div>
        </DialogFooter>
    );
}

export function TaskFormView({ task, onSetViewMode, onTaskMutation, contacts, departments, teamMembers, initialDate }: TaskFormViewProps) {
    const [isPending, startTransition] = useTransition();

    // Estats locals
    const getInitialDate = () => initialDate || (task?.due_date ? new Date(task.due_date) : new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(getInitialDate());
    const [contactComboboxOpen, setContactComboboxOpen] = useState(false);
    const [selectedContactId, setSelectedContactId] = useState<string | null>(task?.contact_id?.toString() ?? null);
    const [teamMemberComboboxOpen, setTeamMemberComboboxOpen] = useState(false);
    const [assignedUserId, setAssignedUserId] = useState<string | null>(task?.user_asign_id ?? null);
    const [descriptionContent, setDescriptionContent] = useState<string>(task?.description ?? '');

    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        formData.set('description', descriptionContent);

        const action = task ? updateTask : createTask;

        startTransition(async () => {
            const initialState = { success: undefined, error: undefined };
            const result = await action(initialState, formData);

            if (result.error) {
                const errorValues = Object.values(result.error).flat().join('\n');
                toast.error('Hi ha hagut un error', { description: errorValues });
            } else if (result.success) {
                toast.success(task ? 'Tasca actualitzada!' : 'Tasca creada!');
                
                // ✅ CORRECTE: Cridem la funció sense paràmetres.
                // Això farà que el component pare executi l'acció per defecte (tancar el diàleg).
                onTaskMutation();
            }
        });
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle className="text-2xl">{task ? 'Editar Tasca' : 'Crear Nova Tasca'}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit}>
                {task && <input type="hidden" name="taskId" value={task.id} />}

                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-4">
                    {/* Títol */}
                    <div className="space-y-2">
                        <Label htmlFor="title" className="flex items-center gap-2"><ListTodo className="w-4 h-4" />Títol</Label>
                        <Input id="title" name="title" defaultValue={task?.title ?? ''} placeholder="Ex: Preparar informe trimestral" required />
                    </div>

                    {/* Descripció */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="flex items-center gap-2"><AlignLeft className="w-4 h-4" />Descripció</Label>
                        <EditorWysiwyg
                            id="description"
                            name="description"
                            defaultValue={descriptionContent}
                            onChange={(html) => setDescriptionContent(html)}
                        />
                    </div>

                    {/* Resta dels camps del formulari (sense canvis) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" />Data de venciment</Label>
                            <Popover>
                                <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !dueDate && "text-muted-foreground")}>{dueDate ? format(dueDate, "PPP", { locale: es }) : <span>Selecciona una data</span>}</Button></PopoverTrigger>
                                <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={dueDate} onSelect={setDueDate} autoFocus /></PopoverContent>
                            </Popover>
                            <input type="hidden" name="due_date" value={dueDate ? dueDate.toISOString() : ''} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="priority" className="flex items-center gap-2"><Flag className="w-4 h-4" />Prioritat</Label>
                            <Select name="priority" defaultValue={task?.priority ?? 'Mitjana'}>
                                <SelectTrigger><SelectValue placeholder="Selecciona una prioritat" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Baixa">Baixa</SelectItem>
                                    <SelectItem value="Mitjana">Mitjana</SelectItem>
                                    <SelectItem value="Alta">Alta</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="duration" className="flex items-center gap-2"><Clock className="w-4 h-4" />Duració</Label>
                            <Input id="duration" name="duration" type="number" step="0.01" placeholder="Hores (ex: 1.25)" defaultValue={task?.duration ?? ''} />
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 space-y-2">
                            <Label className="flex items-center gap-2"><User className="w-4 h-4" />Assignar a</Label>
                            <Popover open={teamMemberComboboxOpen} onOpenChange={setTeamMemberComboboxOpen}>
                                <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between font-normal">{assignedUserId ? teamMembers.find(m => m.id === assignedUserId)?.full_name : "Selecciona un membre"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Cercar membre..." />
                                        <CommandList><CommandEmpty>No s'ha trobat cap membre.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem onSelect={() => { setAssignedUserId(null); setTeamMemberComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", !assignedUserId ? "opacity-100" : "opacity-0")} />Sense assignar</CommandItem>
                                                {teamMembers.map((user) => (<CommandItem key={user.id} value={user.full_name ?? ''} onSelect={() => { setAssignedUserId(user.id); setTeamMemberComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", assignedUserId === user.id ? "opacity-100" : "opacity-0")} />{user.full_name}</CommandItem>))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                                <input type="hidden" name="user_asign_id" value={assignedUserId ?? 'none'} />
                            </Popover>
                        </div>
                        <div className="col-span-1 space-y-2">
                            <Label htmlFor="assignment_date" className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" />Data assignació</Label>
                            <Input id="assignment_date" name="assignment_date" type="text" value={task?.asigned_date ? format(new Date(task.asigned_date), "dd/MM/yyyy") : '-'} readOnly className="bg-muted/50 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="flex items-center gap-2"><User className="w-4 h-4" />Contacte associat</Label>
                            <Popover open={contactComboboxOpen} onOpenChange={setContactComboboxOpen}>
                                <PopoverTrigger asChild><Button variant="outline" role="combobox" className="w-full justify-between font-normal">{selectedContactId ? contacts.find(c => c.id.toString() === selectedContactId)?.nom : "Selecciona un contacte"}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Cercar contacte..." />
                                        <CommandList><CommandEmpty>No s'ha trobat cap contacte.</CommandEmpty>
                                            <CommandGroup>
                                                <CommandItem onSelect={() => { setSelectedContactId(null); setContactComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", !selectedContactId ? "opacity-100" : "opacity-0")} />Cap</CommandItem>
                                                {contacts.map((contact) => (<CommandItem key={contact.id} value={contact.nom ?? ''} onSelect={() => { setSelectedContactId(contact.id.toString()); setContactComboboxOpen(false); }}><Check className={cn("mr-2 h-4 w-4", selectedContactId === contact.id.toString() ? "opacity-100" : "opacity-0")} />{contact.nom}</CommandItem>))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                                <input type="hidden" name="contact_id" value={selectedContactId ?? 'none'} />
                            </Popover>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="department_id" className="flex items-center gap-2"><Building className="w-4 h-4" />Departament</Label>
                            <Select name="department_id" defaultValue={task?.department_id?.toString() ?? 'none'}>
                                <SelectTrigger><SelectValue placeholder="Selecciona un departament" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Cap</SelectItem>
                                    {departments.map(dep => (<SelectItem key={dep.id} value={dep.id.toString()}>{dep.name}</SelectItem>))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <FormActions isEditing={!!task} onSetViewMode={onSetViewMode} isPending={isPending} />
            </form>
        </>
    );
}