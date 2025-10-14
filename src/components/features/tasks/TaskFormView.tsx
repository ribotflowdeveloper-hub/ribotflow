'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormStatus } from 'react-dom';
import { createTask, updateTask } from '@/app/actions/tasks/actions';
import { EnrichedTask } from './TaskDialogManager';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { ArrowLeft } from 'lucide-react';

interface TaskFormViewProps {
    task: EnrichedTask | null;
    onSetViewMode: () => void;
    onTaskMutation: () => void;
    contacts: Tables<'contacts'>[];
    departments: Tables<'departments'>[];
    teamMembers: { id: string; full_name: string | null }[];
    initialDate?: Date;
}

function FormActions({ isEditing, onSetViewMode }: { isEditing: boolean, onSetViewMode: () => void }) {
    const { pending } = useFormStatus();

    // DEBUG: Mostrem l'estat de 'pending' a cada renderització dels botons
    console.log(`[TaskFormView - FormActions] Renderitzant botons. Pendent: ${pending}`);

    return (
        <DialogFooter className="sm:justify-between mt-4">
            <div>
                {isEditing && (
                    <Button type="button" variant="ghost" onClick={onSetViewMode} disabled={pending}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Tornar a la vista
                    </Button>
                )}
            </div>
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button type="button" variant="secondary" disabled={pending}>Cancel·lar</Button>
                </DialogClose>
                <Button type="submit" disabled={pending}>
                    {pending
                        ? (isEditing ? 'Guardant...' : 'Creant...')
                        : (isEditing ? 'Guardar Canvis' : 'Crear Tasca')}
                </Button>
            </div>
        </DialogFooter>
    );
}


export function TaskFormView({ task, onSetViewMode, onTaskMutation, contacts, departments, teamMembers, initialDate }: TaskFormViewProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const action = task ? updateTask : createTask;
    const [state, formAction] = useActionState(action, { success: undefined, error: undefined });
    const [, startTransition] = useTransition();

    // DEBUG: Mostrem l'estat que rebem de la Server Action
    console.log("[TaskFormView] Estat actual de l'acció:", state);

    useEffect(() => {
        if (state?.success) {
            toast.success(task ? 'Tasca actualitzada!' : 'Tasca creada!');
            // ✅ SOLUCIÓ: Ara només cridem a 'onTaskMutation'.
            // El pare s'encarregarà de refrescar I de tancar.
            startTransition(() => {
                onTaskMutation();
            });
        }
        if (state?.error) {
            console.error("❌ [TaskFormView] ERROR DETECTAT:", state.error);
            const errorValues = Object.values(state.error).flat().join('\n');
            toast.error('Hi ha hagut un error', { description: errorValues });
        }
    }, [state, task, onTaskMutation, startTransition]);

    const getInitialDateValue = () => {
        const dateToFormat = initialDate || (task?.due_date ? new Date(task.due_date) : new Date());
        const offset = dateToFormat.getTimezoneOffset();
        const localDate = new Date(dateToFormat.getTime() - (offset * 60 * 1000));
        return localDate.toISOString().slice(0, 16);
    };

    return (
        <>
            <DialogHeader>
                <DialogTitle>{task ? 'Editar Tasca' : 'Crear Nova Tasca'}</DialogTitle>
            </DialogHeader>

            <form ref={formRef} action={formAction}>
                {task && <input type="hidden" name="taskId" value={task.id} />}

                <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                    {/* ... Tots els camps del formulari (Inputs, Selects, etc.) es mantenen igual ... */}
                    <div className="space-y-2">
                        <Label htmlFor="title">Títol</Label>
                        <Input id="title" name="title" defaultValue={task?.title ?? ''} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="description">Descripció</Label>
                        <Textarea id="description" name="description" defaultValue={task?.description ?? ''} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="due_date">Data de venciment</Label>
                        <Input id="due_date" name="due_date" type="datetime-local" defaultValue={getInitialDateValue()} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="priority">Prioritat</Label>
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
                        <Label htmlFor="user_asign_id">Assignar a</Label>
                        <Select name="user_asign_id" defaultValue={task?.user_asign_id ?? 'none'}>
                            <SelectTrigger><SelectValue placeholder="Selecciona un membre" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Sense assignar</SelectItem>
                                {teamMembers.map(user => (<SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="contact_id">Contacte associat</Label>
                        <Select name="contact_id" defaultValue={task?.contact_id?.toString() ?? 'none'}>
                            <SelectTrigger><SelectValue placeholder="Selecciona un contacte" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Cap</SelectItem>
                                {contacts.map(contact => (<SelectItem key={contact.id} value={contact.id.toString()}>{contact.nom}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="department_id">Departament</Label>
                        <Select name="department_id" defaultValue={task?.department_id?.toString() ?? 'none'}>
                            <SelectTrigger><SelectValue placeholder="Selecciona un departament" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Cap</SelectItem>
                                {departments.map(dep => (<SelectItem key={dep.id} value={dep.id.toString()}>{dep.name}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <FormActions isEditing={!!task} onSetViewMode={onSetViewMode} />


            </form>
        </>
    );
}