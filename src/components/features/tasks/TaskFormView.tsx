'use client';

import { useActionState, useEffect, useRef } from 'react';
import { DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFormStatus } from 'react-dom';
import { createTask, updateTask } from '@/app/[locale]/(app)/crm/calendari/actions';
import { EnrichedTask } from './TaskDialogManager';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { ArrowLeft } from 'lucide-react';

interface TaskFormViewProps {
  task: EnrichedTask | null;
  onSetViewMode: () => void;
  onTaskMutation: () => void;
  onClose: () => void;
  contacts: Tables<'contacts'>[];
  departments: Tables<'departments'>[];
  teamMembers: { id: string; full_name: string | null }[];
}

export function TaskFormView({ task, onSetViewMode, onTaskMutation, onClose, contacts, departments, teamMembers }: TaskFormViewProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const action = task ? updateTask : createTask;
  const [state, formAction] = useActionState(action, { success: undefined, error: undefined });

  useEffect(() => {
    if (state?.success) {
      toast.success(task ? 'Tasca actualitzada!' : 'Tasca creada!');
      onTaskMutation();
      onClose();
    }
    if (state?.error) {
      const errorValues = Object.values(state.error).flat().join('\n');
      toast.error('Hi ha hagut un error', { description: errorValues });
    }
  }, [state, onClose, task, onTaskMutation]);

  // Aquest component intern gestiona l'estat 'pending' dels botons del peu de pàgina.
  function FormActions({ isEditing }: { isEditing: boolean }) {
    const { pending } = useFormStatus();
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
            {pending ? (isEditing ? 'Guardant...' : 'Creant...') : (isEditing ? 'Guardar Canvis' : 'Crear Tasca')}
          </Button>
        </div>
      </DialogFooter>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{task ? 'Editar Tasca' : 'Crear Nova Tasca'}</DialogTitle>
      </DialogHeader>
      <form ref={formRef} action={formAction}>
        {task && <input type="hidden" name="taskId" value={task.id} />}
        <div className="grid gap-4 py-4">
          
          {/* Títol */}
          <div className="space-y-2">
            <Label htmlFor="title">Títol</Label>
            <Input id="title" name="title" defaultValue={task?.title ?? ''} required />
          </div>

          {/* Descripció */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripció</Label>
            <Textarea id="description" name="description" defaultValue={task?.description ?? ''} />
          </div>

          {/* Data de venciment */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Data de venciment</Label>
            <Input id="due_date" name="due_date" type="datetime-local" defaultValue={task?.due_date ? new Date(task.due_date).toISOString().slice(0, 16) : ''} required />
          </div>

          {/* Prioritat */}
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

          {/* Assignar a (Membre de l'equip) */}
          <div className="space-y-2">
            <Label htmlFor="user_asign_id">Assignar a</Label>
            <Select name="user_asign_id" defaultValue={task?.user_asign_id ?? 'none'}>
              <SelectTrigger><SelectValue placeholder="Selecciona un membre" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sense assignar</SelectItem>
                {teamMembers.map(user => (
                  <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Contacte associat (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="contact_id">Contacte associat</Label>
            <Select name="contact_id" defaultValue={task?.contact_id?.toString() ?? 'none'}>
              <SelectTrigger><SelectValue placeholder="Selecciona un contacte" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Cap</SelectItem>
                {contacts.map(contact => (
                  <SelectItem key={contact.id} value={contact.id.toString()}>{contact.nom}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Departament (Opcional) */}
          <div className="space-y-2">
            <Label htmlFor="department_id">Departament</Label>
            <Select name="department_id" defaultValue={task?.department_id?.toString() ?? 'none'}>
              <SelectTrigger><SelectValue placeholder="Selecciona un departament" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Cap</SelectItem>
                {departments.map(dep => (
                  <SelectItem key={dep.id} value={dep.id.toString()}>{dep.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

        </div>
        
        {/* Passem l'estat d'edició per saber quin text mostrar als botons */}
        <FormActions isEditing={!!task} />
      </form>
    </>
  );
}