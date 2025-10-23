// src/components/features/tasks/TaskFormView.tsx (ACTUALITZAT)

'use client';

import { useState, useTransition, FormEvent } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import EditorWysiwyg from '@/components/ui/EditorWysiwyg';
import { createTask, updateTask } from '@/app/actions/tasks/actions';
import { EnrichedTask } from './TaskDialogManager';
import { toast } from 'sonner';
import { Tables } from '@/types/supabase';
import { ListTodo } from 'lucide-react';
import { JSONContent } from '@tiptap/react'; // <-- Importa JSONContent
// Imports dels nous components extrets
import { FormActions } from './TaskFormActrions';
import { TaskFormSidebar } from './TaskFormSidebar';
import { createDepartment, deleteDepartment } from '@/app/actions/departaments/actions'; // ✅ Importa accions

interface TaskFormViewProps {
    task: EnrichedTask | null;
    onSetViewMode: () => void;
    onTaskMutation: (options?: { closeDialog?: boolean }) => void;
    contacts: Tables<'contacts'>[];
    initialDepartments: Tables<'departments'>[];
    teamMembers: { id: string; full_name: string | null }[];
    initialDate?: Date;
    activeTeamId: string; // ✅ Necessitem l'ID de l'equip actiu
}

export function TaskFormView({
    task,
    onSetViewMode,
    onTaskMutation,
    contacts,
    initialDepartments, // ✅ Rebem els inicials   
    teamMembers,
    initialDate,
    activeTeamId, // ✅ Rebem l'ID de l'equip
}: TaskFormViewProps) {
    const [isPending, startTransition] = useTransition();

    // --- Estats ---
    const getInitialDate = () => initialDate || (task?.due_date ? new Date(task.due_date) : new Date());
    const [dueDate, setDueDate] = useState<Date | undefined>(getInitialDate());
    const [selectedContactId, setSelectedContactId] = useState<string | null>(task?.contact_id?.toString() ?? null);
    const [assignedUserId, setAssignedUserId] = useState<string | null>(task?.user_asign_id ?? null);
    const [descriptionContent, setDescriptionContent] = useState<string>(task?.description ?? '');
    
    // ✅ Estat local per a la llista de departaments
    const [departments, setDepartments] = useState<Tables<'departments'>[]>(initialDepartments);
    // ✅ Estat local per al departament seleccionat
    const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(task?.department_id?.toString() ?? null);

    // ✅ Nou estat per al JSON
    const [descriptionJson, setDescriptionJson] = useState<JSONContent | null>(() => {
        // Intentem parsejar el JSON inicial si existeix
        try {
            // Suposem que task.description_json pot ser string o objecte depenent de com ve de la BD/tipus
            if (task?.description_json) {
                return typeof task.description_json === 'string'
                    ? JSON.parse(task.description_json)
                    : task.description_json;
            }
            return null;
        } catch (error) {
            console.error("Error parsing initial description_json:", error);
            return null;
        }
    });

    // --- Handlers per a Departaments ---
    const handleCreateDepartment = async (name: string): Promise<Tables<'departments'> | null> => {
        const result = await createDepartment(activeTeamId, name);
        if (result.error) {
            toast.error("Error creant departament", { description: result.error });
            return null;
        } else if (result.success && result.newDepartment) {
            toast.success(`Departament "${result.newDepartment.name}" creat.`);
            // Afegeix el nou departament a l'estat local
            setDepartments(prev => [...prev, result.newDepartment!].sort((a,b) => a.name.localeCompare(b.name)));
             // Opcional: Selecciona automàticament el nou departament
             // setSelectedDepartmentId(result.newDepartment.id.toString());
            return result.newDepartment; // Retorna el nou departament
        }
        return null;
    };
    // --- Lògica d'enviament ---
    const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        formData.set('description', descriptionContent);
        // ✅ Assegurem que enviem HTML i JSON
        formData.set('description', descriptionContent);
        formData.set('description_json', JSON.stringify(descriptionJson)); // Enviem com a string
        const action = task ? updateTask : createTask;

        startTransition(async () => {
            const initialState = { success: undefined, error: undefined };
            const result = await action(initialState, formData);

            if (result.error) {
                const errorValues = Object.values(result.error).flat().join('\n');
                toast.error('Hi ha hagut un error', { description: errorValues });
            } else if (result.success) {
                toast.success(task ? 'Tasca actualitzada!' : 'Tasca creada!');
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

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 py-4 h-[65vh]">

                    {/* Columna Esquerra (Títol i Descripció) */}
                    <div className="lg:col-span-2 flex flex-col gap-4 h-full">

                        <div className="space-y-2 flex-shrink-0">
                            <Label htmlFor="title" className="flex items-center gap-2">
                                <ListTodo className="w-4 h-4" />
                                Títol
                            </Label>
                            <Input
                                id="title"
                                name="title"
                                defaultValue={task?.title ?? ''}
                                placeholder="Ex: Preparar informe trimestral"
                                required
                            />
                        </div>

                        <div className="flex-1 min-h-0 h-0">
                            <EditorWysiwyg
                                id="description"
                                name="description" // El name aquí ja no és tan crucial si confiem en l'estat
                                defaultValue={descriptionContent}
                                // ✅ Actualitzem l'onChange
                                onChange={(html, json) => {
                                    setDescriptionContent(html);
                                    setDescriptionJson(json);
                                }}
                                className="h-full" // <- CANVI ANTERIOR: Sembla que 'h-full' SÍ funcionava aquí finalment? Mantinguem-lo si va bé.
                            />
                        </div>
                    </div>

                    {/* Columna Dreta (Metadades) - Component extret */}
                    <TaskFormSidebar
                        task={task}
                        dueDate={dueDate}
                        onDueDateChange={setDueDate}
                        contacts={contacts}
                        selectedContactId={selectedContactId}
                        onContactChange={setSelectedContactId}
                        teamMembers={teamMembers}
                        assignedUserId={assignedUserId}
                        onAssignedUserChange={setAssignedUserId}
                        departments={departments}
                    />
                </div>

                {/* Accions del formulari - Component extret */}
                <FormActions isEditing={!!task} onSetViewMode={onSetViewMode} isPending={isPending} />
            </form>
        </>
    );
}